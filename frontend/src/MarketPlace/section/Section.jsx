import SectionHeader from "./SectionHeader";

export default function Section({
  title,
  subtitle,
  action,
  className = "",
  children,
}) {
  return (
    <section className={`py-10 ${className}`}>
      {(title || subtitle || action) && (
        <SectionHeader
          title={title}
          subtitle={subtitle}
          action={action}
        />
      )}

      {children}
    </section>
  );
}