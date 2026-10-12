import { Metadata } from "next"
import ContentPage from "@modules/common/components/content-page"
import { BRAND, isSolkast } from "@lib/brand"
import AboutSolkast from "../content/about/page-solkast"

export const metadata: Metadata = isSolkast
  ? {
      title: "About Solkast",
      description:
        "Solkast is a premium heavyweight streetwear label. Minimalist cuts in organic cotton, printed to order.",
    }
  : {
      title: "Om Ångerköp",
      description:
        "Ångerköp är ett svenskt streetwear-märke. Tröjor för dig som redan vet hur det slutar — ekologisk bomull, tryckt på beställning i EU.",
    }

export default function AboutPage() {
  if (isSolkast) return <AboutSolkast />

  return (
    <ContentPage
      eyebrow="Om oss"
      title="Vi vet varför du är här."
      intro="Ångerköp är ett svenskt märke för dig som lägger saker i kundvagnen kl 02:47 och ångrar det på söndag. Vi dömer inte. Vi trycker tröjor om det."
    >
      <section>
        <h2>Idén</h2>
        <p>
          De flesta grafiska tröjor är antingen en logga du betalar för att
          göra reklam för, eller ett skämt som slutar vara roligt andra gången
          du har på dig den. Vi ville göra det tredje: tröjor som säger det
          tyst — ORKAR INTE, VARNING: IMPULSKÖP — och som är tillräckligt bra
          för att du ska fortsätta använda dem.
        </p>
      </section>
      <section>
        <h2>Hur det görs</h2>
        <ul>
          <li>
            Ekologisk bomull — Stanley/Stella, GOTS-certifierad. Riktiga
            plagg, inte reklamblad.
          </li>
          <li>
            Tryckt på beställning i EU. Inget lager, ingen överproduktion,
            inget som skeppas runt halva jorden.
          </li>
        </ul>
      </section>
      <section>
        <h2>Säg hej</h2>
        <p>
          Frågor, idéer, eller en tröja du vill se finnas? Mejla{" "}
          <strong>{BRAND.email}</strong> — en människa läser det.
        </p>
      </section>
    </ContentPage>
  )
}

