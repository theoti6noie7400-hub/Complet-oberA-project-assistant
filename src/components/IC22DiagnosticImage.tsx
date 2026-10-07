import { getImageUrl } from "../lib/assistantData";
import { IC22_BASIN_ANNOTATED_IMAGE_URL, IC22_BASIN_IMAGE_NODE_IDS } from "../lib/ic22Diagnostic";

export default function IC22DiagnosticImage({ nodeId }: { nodeId: string }) {
  if (!IC22_BASIN_IMAGE_NODE_IDS.has(nodeId)) return null;
  const url = getImageUrl(IC22_BASIN_ANNOTATED_IMAGE_URL)!;
  return <figure className="space-y-2">
    <p className="text-sm">Repérez les éléments sur l’image avant d’effectuer le contrôle.</p>
    <a href={url} target="_blank" rel="noreferrer" className="block underline"
      aria-label="Agrandir la photo annotée IC22 / KM22 / VL220">
      <img src={url} alt="Repérage OberA : ventilateur, boîtier de commande, swing, lampe UV, capteur niveau eau, pompe, flotteur et tuyau"
        className="max-w-full object-contain rounded" style={{ maxHeight: 420 }} />
      <span className="text-sm">Agrandir la photo</span>
    </a>
  </figure>;
}
