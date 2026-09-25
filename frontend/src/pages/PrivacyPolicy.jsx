import LegalDocumentPage from "./LegalDocumentPage";
import { LEGAL_DOCUMENT_KEYS } from "../lib/resourceTemplate";

export default function PrivacyPolicy() {
  return (
    <LegalDocumentPage
      documentKey={LEGAL_DOCUMENT_KEYS.privacyPolicy}
      title="Privacy Policy"
      description="Learn how Clinq collects, uses, and protects your information."
    />
  );
}
