import { ChartTypes, Result } from "@e2b/code-interpreter";
import { useEffect, useRef } from "react";
import { useMediaQuery } from "usehooks-ts";
import ReactECharts, { EChartsOption } from "echarts-for-react";

function ResponsiveChart({
  option,
  dark,
}: {
  option: EChartsOption;
  dark: boolean;
}) {
  const ref = useRef<ReactECharts>(null);
  useEffect(() => {
    const chart = ref.current?.getEchartsInstance();
    if (!chart) return;
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(chart.getDom());
    return () => observer.disconnect();
  }, [dark]);
  return (
    <ReactECharts ref={ref} option={option} theme={dark ? "dark" : undefined} />
  );
}

export function RenderResult({
  result,
  viewMode,
}: {
  result: Pick<Result, "png" | "chart" | "extra">;
  viewMode: "static" | "interactive";
}) {
  const chart = result.chart ?? result.extra?.chart;
  if (viewMode === "interactive" && chart) {
    return <Chart chart={chart} />;
  }
  if (result.png)
    return <img src={`data:image/png;base64,${result.png}`} alt="plot" />;

  // Plotly charts are not supported yet
  // if (result.html) {
  //   return <div dangerouslySetInnerHTML={{ __html: result.html }} />;
  // }

  return <pre>{JSON.stringify(result, null, 2)}</pre>;
}

export function Chart({ chart }: { chart: ChartTypes }) {
  const dark = useMediaQuery("(prefers-color-scheme: dark)");
  const sharedOptions: EChartsOption = {
    darkMode: dark,
    backgroundColor: "transparent",
    color: dark
      ? ["#FF8800", "#00D992", "#59A8E1", "#FFFF00", "#F54545"]
      : ["#e56f00", "#00a670", "#3C98C7", "#D1A102", "#FF4400"],
    textStyle: {
      color: dark ? "#FFFFFF" : "#0a0a0a",
      fontFamily:
        typeof document === "undefined"
          ? "sans-serif"
          : getComputedStyle(document.body).fontFamily,
    },
    // title: {
    //   text: chart.title,
    //   left: "center",
    //   textStyle: {
    //     fontSize: 14,
    //   },
    // },
    grid: { top: 30, right: 8, bottom: 28, left: 28 },
    legend: {
      // left: "left",
      // orient: "vertical",
    },
  };

  if (chart.type === "line") {
    const series = chart.elements.map((e) => {
      return {
        name: e.label,
        type: "line",
        data: e.points.map((p: [number, number]) => [p[0], p[1]]),
      };
    });

    const options: EChartsOption = {
      ...sharedOptions,
      xAxis: {
        type: "category",
        name: chart.x_label,
        nameLocation: "middle",
      },
      yAxis: {
        name: chart.y_label,
        nameLocation: "middle",
      },
      series,
      tooltip: {
        trigger: "axis",
      },
    };

    return <ResponsiveChart option={options} dark={dark} />;
  }

  if (chart.type === "scatter") {
    const series = chart.elements.map((e) => {
      return {
        name: e.label,
        type: "scatter",
        data: e.points.map((p: [number, number]) => [p[0], p[1]]),
      };
    });

    const options: EChartsOption = {
      ...sharedOptions,
      xAxis: {
        name: chart.x_label,
        nameLocation: "middle",
      },
      yAxis: {
        name: chart.y_label,
        nameLocation: "middle",
      },
      series,
      tooltip: {
        trigger: "axis",
      },
    };

    return <ResponsiveChart option={options} dark={dark} />;
  }

  if (chart.type === "bar") {
    const data = Object.groupBy(chart.elements, ({ group }) => group);

    const series = Object.entries(data).map(([group, elements]) => ({
      name: group,
      type: "bar",
      stack: "total",
      data: elements?.map((e) => [e.label, e.value]),
    }));

    const options: EChartsOption = {
      ...sharedOptions,
      xAxis: {
        type: "category",
        name: chart.x_label,
        nameLocation: "middle",
      },
      yAxis: {
        name: chart.y_label,
        nameLocation: "middle",
      },
      series,
      tooltip: {
        trigger: "axis",
      },
    };

    return <ResponsiveChart option={options} dark={dark} />;
  }

  if (chart.type === "pie") {
    const options: EChartsOption = {
      ...sharedOptions,
      tooltip: {
        trigger: "item",
      },
      series: [
        {
          type: "pie",
          data: chart.elements.map((e) => ({
            value: e.angle,
            name: e.label,
          })),
        },
      ],
    };

    return <ResponsiveChart option={options} dark={dark} />;
  }

  if (chart.type === "box_and_whisker") {
    const series = chart.elements.map((e) => {
      return {
        name: e.label,
        type: "boxplot",
        data: [[e.min, e.first_quartile, e.median, e.third_quartile, e.max]],
      };
    });

    const options: EChartsOption = {
      ...sharedOptions,
      xAxis: {
        type: "category",
        name: chart.x_label,
        nameLocation: "middle",
      },
      yAxis: {
        name: chart.y_label,
        nameLocation: "middle",
        min: "dataMin",
        max: "dataMax",
      },
      series,
      tooltip: {
        trigger: "item",
      },
    };

    return <ResponsiveChart option={options} dark={dark} />;
  }

  if (chart.type === "superchart") {
    return (
      <div className="grid grid-cols-2 gap-4">
        {chart.elements.map((e, index) => (
          <div key={index}>
            <Chart chart={e} />
          </div>
        ))}
      </div>
    );
  }

  return <pre>{JSON.stringify(chart, null, 2)}</pre>;
}
