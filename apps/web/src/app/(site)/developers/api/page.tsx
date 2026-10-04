import { DevDocsShell } from "@/components/developers/dev-docs-shell";
import { RedocEmbed } from "@/components/developers/redoc-embed";

export default function ApiReferencePage() {
  return (
    <DevDocsShell title="API reference" description="Interactive OpenAPI documentation.">
      <p>
        Raw spec: <a href="/openapi.json">/openapi.json</a> · Also served at{" "}
        <code>/api/openapi.json</code> via the backend.
      </p>
      <RedocEmbed />
    </DevDocsShell>
  );
}
