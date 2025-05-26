"""
MCPFabric Control Plane
HealthCheck
"""

import asyncio
import time

import pydantic
from azure.identity import ChainedTokenCredential
from fastapi import HTTPException
from opentelemetry import metrics, trace
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import text

from .config import Config
from .monitor import get_logger

logger = get_logger(__name__)
meter = metrics.get_meter(__name__)
tracer = trace.get_tracer(__name__)


gauge = meter.create_gauge(
    name="healthcheck_gauge",
    description="HealthCheck results",
    unit="int",
)


class HealthCheckResult(pydantic.BaseModel):

    name: str
    passed: bool
    exception: str | None = None

    def __bool__(self) -> bool:
        return self.passed


class HealthCheck:

    @staticmethod
    async def run_async(async_session: AsyncSession,
                        azure_credential: ChainedTokenCredential,
                        config: Config) -> list[HealthCheckResult]:
        """Run all health checks in parallel"""
        timeout = config.healthcheck_timeout.seconds
        results: list[HealthCheckResult] = await asyncio.gather(
            HealthCheck._run_check(HealthCheck._check_app_config_async(config), timeout),
            HealthCheck._run_check(HealthCheck._check_database_async(async_session), timeout),
            HealthCheck._run_check(HealthCheck._check_key_vault_async(config), timeout),
            HealthCheck._run_check(HealthCheck._check_msi_async(azure_credential), timeout),
            HealthCheck._run_check(HealthCheck._check_storage_async(), timeout)
        )
        result_dict = [r.model_dump() for r in results]
        if not all(results):
            raise HTTPException(status_code=500, detail=result_dict)
        return result_dict

    @staticmethod
    async def _run_check(coroutine, timeout: float) -> HealthCheckResult:
        """Run a coroutine with a timeout and catches exceptions"""
        name = str(coroutine.__name__).removeprefix('_check_').removesuffix('_async')
        with tracer.start_as_current_span(f"healthcheck:{name}") as span:
            span.set_attribute("timeout", timeout)
            try:
                result = await asyncio.wait_for(coroutine, timeout=timeout)
                gauge.set(amount=1, attributes={"name": name})
                return HealthCheckResult(name=name, passed=result)
            except asyncio.TimeoutError:
                logger.error(f"HealthCheck: Task {coroutine.__name__} timed out")
                gauge.set(amount=0, attributes={"name": name})
                return HealthCheckResult(name=name, passed=False, exception="timeout")
            except Exception as e:  # pylint: disable=broad-except
                logger.error(f"HealthCheck: Task {coroutine.__name__} failed: {e}")
                gauge.set(amount=0, attributes={"name": name})
                return HealthCheckResult(name=name, passed=False, exception=str(e))

    @staticmethod
    async def _check_app_config_async(config: Config) -> bool:
        """
        Check Azure App Configuration connection.
        Call get_configuration_setting method directly which doesn't cache the response.
        """
        timeout = int(
            config.app_config.get_configuration_setting("Health Check:Timeout Seconds")
            .value
        )
        return timeout > 0

    @staticmethod
    async def _check_database_async(async_session: AsyncSession) -> bool:
        """Check relational database connection and table existence"""
        query = text(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"
        )
        results = await async_session.execute(query)
        return bool(results.scalar())

    @staticmethod
    async def _check_key_vault_async(config: Config) -> bool:
        """
        Check Azure Key Vault connection.
        Call get_secret method directly  which doesn't cache the response.
        """
        return config.secrets.get_secret("healthcheck").value == "healthy"

    @staticmethod
    async def _check_msi_async(azure_credential: ChainedTokenCredential) -> bool:
        """Check Managed Identity token"""
        valid_expiry = int(time.time()) + 5
        token = azure_credential.get_token("https://management.azure.com/.default")
        return token.expires_on > valid_expiry

    @staticmethod
    async def _check_storage_async() -> bool:
        """Check Azure Storage connection"""
        if not Storage().check_if_blob_exists("healthcheck.txt"):
            raise StorageConnectionError("Blob storage connection failed")
