(function (global) {
  'use strict';

  var updateTimer = 0;
  var chartModule = null;
  var palette = global.ZenVisPluginChartPalette;
  if (!palette) {
    throw new Error('ZenVisPluginChartPalette must load before zenvis-plugin-chart.js');
  }

  function axisTheme(includeSplitLine) {
    var option = {
      axisLine: { lineStyle: { color: palette.line } },
      axisTick: { lineStyle: { color: palette.line } },
      axisLabel: { color: palette.text },
      nameTextStyle: { color: palette.text },
    };
    if (includeSplitLine) {
      option.splitLine = { lineStyle: { color: palette.split, type: 'dashed' } };
    }
    return option;
  }

  function patchChart(host) {
    var chart = chartModule && chartModule.getInstanceByDom(host);
    if (!chart) return;

    var current = chart.getOption() || {};
    var patch = {
      backgroundColor: palette.surface,
      darkMode: false,
      textStyle: { color: palette.text },
    };

    if (current.legend) {
      patch.legend = current.legend.map(function () {
        return {
          textStyle: { color: palette.text },
          pageTextStyle: { color: palette.text },
        };
      });
    }
    if (current.title) {
      patch.title = current.title.map(function () {
        return {
          textStyle: { color: palette.heading, fontWeight: 650 },
          subtextStyle: { color: palette.text },
        };
      });
    }
    if (current.xAxis) {
      patch.xAxis = current.xAxis.map(function () {
        return axisTheme(true);
      });
    }
    if (current.yAxis) {
      patch.yAxis = current.yAxis.map(function () {
        return axisTheme(true);
      });
    }
    if (current.radar) {
      patch.radar = current.radar.map(function () {
        return {
          axisName: { color: palette.text },
          splitLine: { lineStyle: { color: palette.split } },
          splitArea: { areaStyle: { color: ['transparent'] } },
          axisLine: { lineStyle: { color: palette.line } },
        };
      });
    }
    if (current.series) {
      patch.series = current.series.map(function (series) {
        return series.type === 'pie'
          ? {
              itemStyle: { borderColor: palette.pieBorder },
              label: { color: palette.text },
              labelLine: { lineStyle: { color: palette.line } },
            }
          : { label: { color: palette.text } };
      });
    }

    chart.setOption(patch, false, true);
    chart.resize();
  }

  function updateCharts() {
    updateTimer = 0;
    try {
      chartModule = chartModule || global.amisRequire('echarts');
    } catch (_) {
      return;
    }
    document.querySelectorAll('[_echarts_instance_]').forEach(patchChart);
  }

  function scheduleUpdate() {
    global.clearTimeout(updateTimer);
    updateTimer = global.setTimeout(updateCharts, 80);
  }

  function start() {
    scheduleUpdate();
    var root = document.getElementById('root') || document.body;
    new MutationObserver(scheduleUpdate).observe(root, { childList: true, subtree: true });
    global.addEventListener('resize', scheduleUpdate);
    document.addEventListener('zenvis:ui-sync', scheduleUpdate);
  }

  global.ZenVisPluginChart = Object.freeze({
    palette: palette,
    refresh: scheduleUpdate,
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})(window);
