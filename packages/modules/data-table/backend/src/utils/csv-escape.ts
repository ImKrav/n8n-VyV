/**
 * Characters that make spreadsheet applications (Excel, LibreOffice, Google Sheets) evaluate a
 * cell as a formula. A cell such as `=HYPERLINK("https://…")` exported as-is is executed when
 * the CSV is opened (CSV/formula injection, CWE-1236 · OWASP A03).
 */
const FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r'];

export interface EscapeCsvOptions {
	/** Prefix formula-like text with a single quote so it is shown as text. Only for free-text columns. */
	neutralizeFormulas?: boolean;
}

/** True when a text value would be interpreted as a formula by a spreadsheet application. */
export function isFormulaLike(value: string): boolean {
	return value.length > 0 && FORMULA_TRIGGERS.includes(value[0]);
}

/**
 * Escapes a value for a CSV cell following RFC 4180:
 * - wraps in quotes when it contains a comma, quote or line break, or has leading/trailing spaces;
 * - doubles inner quotes;
 * - optionally neutralizes formula-like text (see {@link EscapeCsvOptions.neutralizeFormulas}).
 */
export function escapeCsvValue(value: unknown, options: EscapeCsvOptions = {}): string {
	let str = String(value);

	if (options.neutralizeFormulas && isFormulaLike(str)) {
		str = `'${str}`;
	}

	const hasLeadingOrTrailingSpace = str.length > 0 && (str[0] === ' ' || str[str.length - 1] === ' ');
	const needsQuotes =
		str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r') || hasLeadingOrTrailingSpace;

	return needsQuotes ? `"${str.replace(/"/g, '""')}"` : str;
}
