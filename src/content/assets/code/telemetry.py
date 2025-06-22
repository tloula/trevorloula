"""
Python FastAPI OpenTelemetry Example
"""

import logging

from opentelemetry import metrics, trace
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

# Configure Logging
logger = logging.getLogger(__name__)

# Configure Tracing
resource = Resource(attributes={
    "service.name": config.env.service_name,
    "service.version": config.env.service_version,
    "service.environment": config.env.environment,
})
tracer_provider = TracerProvider(resource=resource)
span_processor = BatchSpanProcessor(
    OTLPSpanExporter(endpoint=config.env.trace_collector_endpoint),
)
tracer_provider.add_span_processor(span_processor)

# Configure Metrics
reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint=config.env.metrics_collector_endpoint),
)
meter_provider = MeterProvider(resource=resource, metric_readers=[reader])
metrics.set_meter_provider(meter_provider)

# Instrument the FastAPI app
FastAPIInstrumentor.instrument_app(app=app)

# Instrument SQLAlchemy
SQLAlchemyInstrumentor().instrument(engine=engine)

# Instrument HTTPX
HTTPXClientInstrumentor().instrument()

logger.info(
    "OpenTelemetry initialized with service name: '%s', version: '%s', environment: '%s', & .env file: '%s'",
    config.env.service_name, config.env.service_version, config.env.environment, config.env.loaded_env_file
)
