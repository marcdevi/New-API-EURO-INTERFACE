import { AuthMethod } from '@/types/shopify';

interface Props {
  authMethod: AuthMethod;
}

export function ConnectionStatusBadge({ authMethod }: Props) {
  if (authMethod === 'oauth') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        Mode OAuth — renouvellement automatique du token
      </span>
    );
  }

  if (authMethod === 'manual') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">
        <span className="h-2 w-2 rounded-full bg-yellow-500" />
        Token manuel — renouvellement requis manuellement
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
      <span className="h-2 w-2 rounded-full bg-gray-400" />
      Non configuré
    </span>
  );
}
