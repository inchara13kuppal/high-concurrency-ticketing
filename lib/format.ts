const indianRupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function formatINR(value: number | string) {
  return indianRupees.format(Number(value));
}