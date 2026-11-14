import { IBM_Plex_Mono, Instrument_Serif } from "next/font/google";

// The museum's two accent faces, shared by the hall and the case-study pages. Body text stays in the
// site's Onest (src/app/layout.tsx): these are for headings, catalog numbers and small labels.
export const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument" });
export const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono" });
