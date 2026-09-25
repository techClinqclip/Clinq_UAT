import LegalDocumentPage from "./LegalDocumentPage";
import { LEGAL_DOCUMENT_KEYS } from "../lib/resourceTemplate";

export default function TermsAndConditions() {
  return (
    <LegalDocumentPage
      documentKey={LEGAL_DOCUMENT_KEYS.termsConditions}
      title="Terms & Conditions"
      description="The rules and terms that apply when you use the Clinq platform."
    />
  );
}
