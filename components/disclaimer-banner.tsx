export function DisclaimerBanner(): React.ReactElement {
  return (
    <div
      role="alert"
      aria-label="Legal disclaimer"
      className="w-full bg-red-950/50 border-b border-red-900/70 px-6 py-2 flex-shrink-0"
    >
      <p className="text-xs text-red-300 text-center font-sans tracking-wide">
        <strong className="font-semibold">AI PRE-ANALYSIS ONLY.</strong>
        {' '}Not a legal document. Not admissible as evidence.
        All outputs must be reviewed by qualified legal counsel before use in any legal proceeding.
      </p>
    </div>
  )
}
