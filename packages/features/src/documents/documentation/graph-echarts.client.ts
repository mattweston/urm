import { GraphChart } from "echarts/charts"
import { AriaComponent, TooltipComponent } from "echarts/components"
import * as echarts from "echarts/core"
import { CanvasRenderer } from "echarts/renderers"

echarts.use([AriaComponent, CanvasRenderer, GraphChart, TooltipComponent])

export { echarts }
