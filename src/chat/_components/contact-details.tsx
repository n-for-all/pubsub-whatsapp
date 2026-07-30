interface ContactDetailsProps {
  displayName?: string | null;
}

export default function ContactDetails({ displayName }: ContactDetailsProps) {
  return (
    <div className="space-y-4">
      {/* Contact details will be integrated here */}
      <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {displayName || "Contact"}
      </div>
    </div>
  );
}
