import {
  useState,
} from "react";
import { t } from "../../i18n";

import {
  useStockfish,
} from "../../engine/useStockfish";

import EngineLines from "./EngineLines";
import EvaluationBar from "./EvaluationBar";

type StockfishPanelProps = {
  fen: string;
  hasActiveStudy: boolean;
};

const DEFAULT_DEPTH =
  18;

export default function StockfishPanel({
  fen,
  hasActiveStudy,
}: StockfishPanelProps) {
  const [
    enabled,
    setEnabled,
  ] =
    useState(true);

  const [
    multiPv,
    setMultiPv,
  ] =
    useState<1 | 3>(3);

  const engineEnabled =
    enabled &&
    hasActiveStudy;

  const {
    status,
    lines,
    currentDepth,
    error,
    retry,
  } =
    useStockfish({
      fen,

      enabled:
        engineEnabled,

      depth:
        DEFAULT_DEPTH,

      multiPv,
    });

  const principalLine =
    lines.find(
      (line) =>
        line.multipv ===
        1,
    ) ?? null;

  return (
    <section className="stockfish-panel">
      <EvaluationBar
        score={
          principalLine
            ?.score ??
          null
        }
      />

      <div className="engine-toolbar">
        <button
          type="button"
          className={`engine-power-button ${enabled
              ? "active"
              : ""
            }`}
          onClick={() =>
            setEnabled(
              (current) =>
                !current,
            )
          }
          disabled={
            !hasActiveStudy
          }
        >
          {enabled
            ? t("engine.power.active")
            : t("engine.power.paused")}
        </button>

        <span className="engine-depth-status">
          {t("engine.depth")}{" "}

          <strong>
            {currentDepth ||
              DEFAULT_DEPTH}
          </strong>
        </span>

        <div className="engine-multipv-selector">
          <button
            type="button"
            className={
              multiPv === 1
                ? "active"
                : ""
            }
            onClick={() =>
              setMultiPv(
                1,
              )
            }
          >
            1
          </button>

          <button
            type="button"
            className={
              multiPv === 3
                ? "active"
                : ""
            }
            onClick={() =>
              setMultiPv(
                3,
              )
            }
          >
            3
          </button>
        </div>

        <span className="engine-status-text">
          {status ===
            "loading" &&
            t("engine.loading")}

          {status ===
            "analyzing" &&
            t("engine.analyzing")}

          {status ===
            "ready" &&
            t("engine.ready")}

          {status ===
            "paused" &&
            t("engine.paused")}

          {status ===
            "error" &&
            t("engine.error")}
        </span>
      </div>

      {error ? (
        <div className="engine-error-container">
          <div className="engine-error-content">
            <strong>
              {t("engine.unavailable")}
            </strong>

            <span>
              {error}
            </span>
          </div>

          <button
            type="button"
            className="engine-retry-button"
            onClick={
              retry
            }
          >
            {t("engine.retry")}
          </button>
        </div>
      ) : (
        <EngineLines
          lines={
            lines
          }
          expectedLines={
            multiPv
          }
          fen={
            fen
          }
        />
      )}
    </section>
  );
}