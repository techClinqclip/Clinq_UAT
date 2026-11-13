const INR_FORMATTER_CACHE = new Map();

function getFormatter(decimals) {
  if (!INR_FORMATTER_CACHE.has(decimals)) {
    INR_FORMATTER_CACHE.set(
      decimals,
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    );
  }
  return INR_FORMATTER_CACHE.get(decimals);
}

export function formatINR(amount, { decimals = 0 } = {}) {
  if (amount == null || Number.isNaN(Number(amount))) return "₹0";
  return getFormatter(decimals).format(amount);
}
