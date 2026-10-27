const integers = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const decimals = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
export const fmt = (n) => integers.format(Math.floor(n));
export const decimal = (n) => decimals.format(n);
export const time = (n) =>
  `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(Math.floor(n % 60)).padStart(2, "0")}`;
