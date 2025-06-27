"""
Python FastAPI OpenTelemetry Example
"""

import logging
from sqlalchemy import create_engine
from fastapi import FastAPI
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

# Variables
SERVICE_NAME = "my-service"
SERVICE_VERSION = "1.0.0"
ENVIRONMENT = "production"
TRACE_COLLECTOR_ENDPOINT = "http://localhost:4318/v1/traces"
METRICS_COLLECTOR_ENDPOINT = "http://localhost:4318/v1/metrics"

# Configure Logging
logger = logging.getLogger(__name__)

# Configure Tracing
resource = Resource(attributes={
    "service.name": SERVICE_NAME,
    "service.version": SERVICE_VERSION,
    "service.environment": ENVIRONMENT,
})
tracer_provider = TracerProvider(resource=resource)
span_processor = BatchSpanProcessor(
    OTLPSpanExporter(endpoint=TRACE_COLLECTOR_ENDPOINT),
)
tracer_provider.add_span_processor(span_processor)
trace.set_tracer_provider(tracer_provider)

# Configure Metrics
reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint=METRICS_COLLECTOR_ENDPOINT),
)
meter_provider = MeterProvider(resource=resource, metric_readers=[reader])
metrics.set_meter_provider(meter_provider)

# Instrument the FastAPI app
app = FastAPI()
FastAPIInstrumentor.instrument_app(app=app)

# Instrument SQLAlchemy
engine = create_engine("sqlite:///:memory:")
SQLAlchemyInstrumentor().instrument(engine=engine)

# Instrument HTTPX
HTTPXClientInstrumentor().instrument()

logger.info(
    "OpenTelemetry initialized with service name: '%s', version: '%s', environment: '%s'",
    SERVICE_NAME, SERVICE_VERSION, ENVIRONMENT
)
