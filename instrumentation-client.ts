// Work around a known dev-time Performance API edge case in Next 16 + Turbopack
// where a route measure can throw due to an invalid negative timestamp.
if (typeof window !== "undefined" && typeof performance !== "undefined") {
  const originalMeasure = performance.measure.bind(performance);

  performance.measure = ((
    measureName: string,
    startOrOptions?: string | PerformanceMeasureOptions,
    endMark?: string,
  ) => {
    try {
      return originalMeasure(measureName, startOrOptions as never, endMark);
    } catch (error) {
      if (
        error instanceof TypeError &&
        measureName.includes("DashboardPage") &&
        error.message.includes("negative time stamp")
      ) {
        return;
      }
      throw error;
    }
  }) as Performance["measure"];
}
