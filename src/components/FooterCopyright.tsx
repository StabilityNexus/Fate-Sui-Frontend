const START_YEAR = 2023;

export default function FooterCopyright() {
  const currentYear = new Date().getFullYear();

  const yearText =
    currentYear === START_YEAR
      ? START_YEAR
      : `${START_YEAR}-${currentYear}`;

  return (
    <p className="text-sm text-muted-foreground">
      © {yearText} The Stable Order. All rights reserved.
    </p>
  );
}
