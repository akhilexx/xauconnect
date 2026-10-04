"use client";

/**
 * CandleChart — lightweight-charts candlestick + volume histogram with a
 * gold-on-glass theme. Pure client component; data comes in as props.
 */
import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Candle } from "@xauconnect/utils";

/** lightweight-charts requires unix seconds; API/cache may return ms or strings. */
function normalizeTime(time: unknown): UTCTimestamp {
  if (typeof time === "number" && Number.isFinite(time)) {
    const sec = time > 1e12 ? Math.floor(time / 1000) : Math.floor(time);
    return sec as UTCTimestamp;
  }
  if (typeof time === "string") {
    const ms = Date.parse(time);
    if (Number.isFinite(ms)) return Math.floor(ms / 1000) as UTCTimestamp;
  }
  throw new Error(`Invalid candle time: ${String(time)}`);
}

function normalizeCandles(candles: Candle[]) {
  const byTime = new Map<number, Candle>();
  for (const c of candles) {
    const time = normalizeTime(c.time);
    byTime.set(time, { ...c, time });
  }
  return [...byTime.values()].sort((a, b) => a.time - b.time);
}

function toCandleData(candles: Candle[]) {
  return normalizeCandles(candles).map((c) => ({
    time: c.time as UTCTimestamp,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }));
}

function toVolumeData(candles: Candle[]) {
  return normalizeCandles(candles).map((c) => ({
    time: c.time as UTCTimestamp,
    value: c.volume ?? 0,
    color: c.close >= c.open ? "rgba(22, 163, 74, 0.35)" : "rgba(239, 68, 68, 0.35)",
  }));
}

export function CandleChart({ candles, height }: { candles: Candle[]; height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const prevLenRef = useRef(0);
  const firstTimeRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const [chartHeight, setChartHeight] = useState(height ?? 380);

  useEffect(() => {
    if (height) {
      setChartHeight(height);
      return;
    }
    const mq = window.matchMedia("(max-width: 640px)");
    const sync = () => setChartHeight(mq.matches ? 260 : 380);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [height]);

  // Mount chart once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      height: chartHeight,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#6B7280",
        fontFamily: "Inter, sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(15, 23, 42, 0.05)" },
        horzLines: { color: "rgba(15, 23, 42, 0.05)" },
      },
      rightPriceScale: { borderColor: "rgba(15, 23, 42, 0.1)" },
      timeScale: { borderColor: "rgba(15, 23, 42, 0.1)", timeVisible: true },
      crosshair: {
        vertLine: { color: "rgba(255, 170, 0, 0.4)", labelBackgroundColor: "#FFAA00" },
        horzLine: { color: "rgba(255, 170, 0, 0.4)", labelBackgroundColor: "#FFAA00" },
      },
    });
    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#16A34A",
      downColor: "#EF4444",
      borderUpColor: "#16A34A",
      borderDownColor: "#EF4444",
      wickUpColor: "#16A34A",
      wickDownColor: "#EF4444",
      priceFormat: { type: "price", precision: 8, minMove: 0.00000001 },
    });
    candleSeriesRef.current = candleSeries;

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    volumeSeriesRef.current = volumeSeries;

    const observer = new ResizeObserver(() => {
      chart.applyOptions({ width: container.clientWidth });
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      prevLenRef.current = 0;
      firstTimeRef.current = null;
      lastTimeRef.current = null;
    };
  }, [chartHeight]);

  // Incremental data updates — only patch the last bar when the series window is stable.
  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    const chart = chartRef.current;
    if (!candleSeries || !volumeSeries || !chart || candles.length === 0) return;

    const prevLen = prevLenRef.current;
    const candleData = toCandleData(candles);
    const volumeData = toVolumeData(candles);
    if (candleData.length === 0) return;

    const firstTime = candleData[0]!.time as number;
    const lastTime = candleData[candleData.length - 1]!.time as number;
    const canPatchLastBar =
      prevLen > 0 &&
      candleData.length === prevLen &&
      firstTime === firstTimeRef.current &&
      lastTime === lastTimeRef.current;

    try {
      if (canPatchLastBar) {
        candleSeries.update(candleData[candleData.length - 1]!);
        volumeSeries.update(volumeData[volumeData.length - 1]!);
      } else {
        candleSeries.setData(candleData);
        volumeSeries.setData(volumeData);
        if (prevLen === 0) chart.timeScale().fitContent();
      }
    } catch {
      candleSeries.setData(candleData);
      volumeSeries.setData(volumeData);
    }

    prevLenRef.current = candleData.length;
    firstTimeRef.current = firstTime;
    lastTimeRef.current = lastTime;
  }, [candles]);

  return <div ref={containerRef} className="w-full" style={{ minHeight: chartHeight }} />;
}
