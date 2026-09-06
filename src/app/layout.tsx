import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, Literata } from "next/font/google";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: false,
});

const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fiocruz Rio | Conheça o Campus Manguinhos",
  description: "Explore o campus da Fiocruz Rio em Manguinhos e conheça seus espaços de pesquisa, saúde, educação, cultura e memória.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${atkinson.variable} ${literata.variable}`}>
      <body>{children}</body>
    </html>
  );
}
