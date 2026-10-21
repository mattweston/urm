In each service's settings:

Set the Dockerfile path
Configure environment variables
Use Railway's private networking (`servicename.railway.internal`)

```elixir
# In your Phoenix app, use PromEx (popular Elixir library)
# mix.exs
{:prom_ex, "~> 1.9"}

# lib/my_app/prom_ex.ex
defmodule MyApp.PromEx do
  use PromEx, otp_app: :my_app

  @impl true
  def plugins do
    [
      PromEx.Plugins.Application,
      PromEx.Plugins.Beam,
      {PromEx.Plugins.Phoenix, router: MyAppWeb.Router},
      PromEx.Plugins.Ecto
    ]
  end
end
```

Now you'll need to create the configuration files.

config/prometheus.yml (to scrape your Phoenix app)
config/grafana/provisioning/datasources/datasources.yml (to connect Grafana to Prometheus, Loki, and Tempo)
config/tempo.yaml (Tempo configuration)

PromEx → Prometheus ✅

PromEx exposes /metrics endpoint
Prometheus scrapes it for metrics (CPU, memory, request counts, etc.)

Grafana ✅

Grafana is just a visualization tool
It queries Prometheus (and Loki, and Tempo) to display data
No special Phoenix library needed - just configure Grafana to use Prometheus as a data source

Loki (logs) - Need separate library

PromEx doesn't send logs to Loki
Use something like:

logfmt_ex or jason to format logs as JSON
Configure Elixir's Logger to output in a Loki-friendly format
Or use promtail (Loki's agent) to ship logs from files

Tempo (traces) - Need separate library

PromEx doesn't send traces
Use opentelemetry + opentelemetry_exporter Elixir libraries:

elixir# mix.exs
{:opentelemetry, "~> 1.3"},
{:opentelemetry_exporter, "~> 1.6"},
{:opentelemetry_phoenix, "~> 1.1"},
{:opentelemetry_ecto, "~> 1.1"}
Summary:

PromEx = Metrics only (Prometheus)
Grafana = Works automatically (just configure data sources)
Loki = Need logging setup
Tempo = Need OpenTelemetry libraries

You can start with just PromEx + Prometheus + Grafana, then add Loki and Tempo later if you want logs and distributed tracing. Metrics alone give you a lot of value!RetryClaude can make mistakes. Please double-check responses.
