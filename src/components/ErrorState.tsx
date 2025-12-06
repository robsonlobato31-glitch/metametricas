import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ErrorStateProps {
    error?: Error | null;
    retry?: () => void;
    title?: string;
    description?: string;
    showDetails?: boolean;
}

/**
 * ErrorState Component
 * 
 * Displays a user-friendly error message with optional retry button.
 * Can be used as a fallback UI for ErrorBoundary or for handling query errors.
 * 
 * Usage:
 * ```tsx
 * {error && <ErrorState error={error} retry={refetch} />}
 * ```
 */
export function ErrorState({
    error,
    retry,
    title = 'Erro ao carregar dados',
    description = 'Ocorreu um erro ao carregar os dados. Por favor, tente novamente.',
    showDetails = true,
}: ErrorStateProps) {
    return (
        <div className="flex items-center justify-center min-h-[300px] p-6">
            <div className="w-full max-w-md space-y-4">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{title}</AlertTitle>
                    <AlertDescription className="mt-2">
                        {description}
                    </AlertDescription>
                </Alert>

                {showDetails && error && (
                    <details className="text-sm bg-muted p-4 rounded-md">
                        <summary className="cursor-pointer font-medium mb-2 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            Detalhes técnicos
                        </summary>
                        <div className="mt-2 space-y-2">
                            <div>
                                <span className="font-semibold">Mensagem:</span>
                                <pre className="mt-1 overflow-auto text-xs bg-background p-2 rounded border">
                                    {error.message}
                                </pre>
                            </div>
                            {error.stack && (
                                <div>
                                    <span className="font-semibold">Stack trace:</span>
                                    <pre className="mt-1 overflow-auto text-xs bg-background p-2 rounded border max-h-40">
                                        {error.stack}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </details>
                )}

                {retry && (
                    <div className="flex justify-center">
                        <Button onClick={retry} variant="outline" className="gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Tentar Novamente
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Compact version for inline errors
 */
export function InlineErrorState({
    error,
    retry,
}: Pick<ErrorStateProps, 'error' | 'retry'>) {
    return (
        <div className="flex items-center justify-between p-4 bg-destructive/10 border border-destructive/20 rounded-md">
            <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{error?.message || 'Erro ao carregar dados'}</span>
            </div>
            {retry && (
                <Button onClick={retry} variant="ghost" size="sm" className="gap-1">
                    <RefreshCw className="h-3 w-3" />
                    Tentar novamente
                </Button>
            )}
        </div>
    );
}
