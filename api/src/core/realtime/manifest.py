from ..feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="realtime",
    label="Realtime",
    description="Infrastructure SSE/temps reel — les features declarent depends: ['realtime'] pour recevoir les updates en direct",
    depends=["event"],
    permissions=["realtime.stream"],
    router_module="src.core.realtime.routes",
    router_prefix="/api/realtime",
    router_tags=["Realtime"],
)
