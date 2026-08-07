import {
    Component,
    type ErrorInfo,
    type ReactNode,
} from "react";

type ErrorBoundaryProps = {
    children: ReactNode;
};

type ErrorBoundaryState = {
    hasError: boolean;
    error: Error | null;
};

export default class ErrorBoundary extends Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
> {
    state: ErrorBoundaryState = {
        hasError: false,
        error: null,
    };

    static getDerivedStateFromError(
        error: Error,
    ): ErrorBoundaryState {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(
        error: Error,
        info: ErrorInfo,
    ) {
        console.error(
            "Error no controlado en Chessktop:",
            error,
            info,
        );
    }

    private reloadApplication = () => {
        window.location.reload();
    };

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        return (
            <main className="error-boundary">
                <section className="error-boundary-card">
                    <span
                        className="error-boundary-icon"
                        aria-hidden="true"
                    >
                        ♟
                    </span>

                    <h1>
                        Chessktop ha encontrado un error
                    </h1>

                    <p>
                        La interfaz no ha podido continuar.
                        Tus estudios guardados no se han
                        eliminado.
                    </p>

                    {this.state.error && (
                        <code className="error-boundary-message">
                            {this.state.error.message}
                        </code>
                    )}

                    <button
                        type="button"
                        onClick={
                            this.reloadApplication
                        }
                    >
                        Reiniciar Chessktop
                    </button>
                </section>
            </main>
        );
    }
}