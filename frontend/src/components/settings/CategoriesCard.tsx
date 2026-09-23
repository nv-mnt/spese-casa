/**
 * Elenco delle categorie disponibili.
 *
 * Sono enum fissi (in Python **e** in Postgres), quindi la scheda e' di sola
 * consultazione: serve a sapere cosa si puo' scegliere nei form, non a
 * modificarle. Se un giorno diventassero configurabili, il posto e' questo.
 */

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { stileCategoria } from '@/lib/categories';
import { stileEntrataComune } from '@/lib/commonIncomeCategories';
import { stileEntrata, stileUscita } from '@/lib/personalCategories';
import { cn } from '@/lib/utils';
import {
  CATEGORIE,
  CATEGORIE_ENTRATA,
  CATEGORIE_ENTRATA_COMUNE,
  CATEGORIE_USCITA,
} from '@/types';

type Stile = { dot: string; emoji: string };

function Gruppo({
  titolo,
  nota,
  voci,
  stile,
}: {
  titolo: string;
  nota: string;
  voci: readonly string[];
  stile: (categoria: string) => Stile;
}) {
  return (
    <div>
      <p className="font-display text-sm font-bold text-foreground">{titolo}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{nota}</p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {voci.map((voce) => {
          const s = stile(voce);
          return (
            <span
              key={voce}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-2.5 py-0.5',
                'text-xs font-bold text-foreground',
                s.dot,
              )}
            >
              <span aria-hidden="true">{s.emoji}</span>
              {voce}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function CategoriesCard() {
  return (
    <Card id="categorie" className="scroll-mt-24" aria-labelledby="titolo-categorie-impostazioni">
      <CardHeader>
        <CardTitle id="titolo-categorie-impostazioni">
          <span aria-hidden="true">&#127991;&#65039;</span> Categorie
        </CardTitle>
        <span className="text-xs font-bold text-muted-foreground">Elenco fisso</span>
      </CardHeader>

      <div className="space-y-5 px-5 py-4">
        <Gruppo
          titolo="Spese di casa"
          nota="Usate nel registro spese condiviso."
          voci={CATEGORIE}
          stile={stileCategoria}
        />
        <Gruppo
          titolo="Entrate comuni"
          nota="Soldi che rientrano nel bilancio di casa."
          voci={CATEGORIE_ENTRATA_COMUNE}
          stile={stileEntrataComune}
        />
        <Gruppo
          titolo="Entrate personali"
          nota="Solo nel tuo budget personale."
          voci={CATEGORIE_ENTRATA}
          stile={stileEntrata}
        />
        <Gruppo
          titolo="Uscite personali"
          nota="Solo nel tuo budget personale."
          voci={CATEGORIE_USCITA}
          stile={stileUscita}
        />
      </div>

      <div className="border-t-2 border-dashed border-ink/25 bg-muted/40 px-5 py-3">
        <p className="text-xs font-semibold leading-relaxed text-muted-foreground">
          <span aria-hidden="true">&#128274;</span> Le categorie non sono modificabili: sono un
          elenco fisso anche nel database, cos&igrave; non pu&ograve; finirci dentro un valore
          fuori lista.
        </p>
      </div>
    </Card>
  );
}
