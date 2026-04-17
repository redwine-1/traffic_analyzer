type AnalysisControlsPanelProps = {
    model: string
    modelOptions: string[]
    availableClasses: string[]
    selectedClasses: string[]
    loiHeight: number
    loiMax: number
    configStatus: string
    onModelChange: (nextModel: string) => void
    onClassToggle: (className: string) => void
    onLoiHeightChange: (nextHeight: number) => void
    onSetConfig: () => void
}

function AnalysisControlsPanel({
    model,
    modelOptions,
    availableClasses,
    selectedClasses,
    loiHeight,
    loiMax,
    configStatus,
    onModelChange,
    onClassToggle,
    onLoiHeightChange,
    onSetConfig,
}: AnalysisControlsPanelProps) {
    return (
        <section className="analysis-panel controls-panel" aria-label="Model and classes configuration">
            <div className="panel-header">
                <h2 className="panel-title">Configuration</h2>
                <p className="panel-subtitle">Tune model, classes, and LOI.</p>
            </div>

            <div className="control-group">
                <label className="control-label" htmlFor="model-select">
                    Model
                </label>
                <select
                    id="model-select"
                    className="control-select"
                    value={model}
                    onChange={(event) => onModelChange(event.target.value)}
                >
                    {modelOptions.map((modelOption) => (
                        <option key={modelOption} value={modelOption}>
                            {modelOption}
                        </option>
                    ))}
                </select>
            </div>

            <div className="control-group">
                <p className="control-label">Classes</p>
                <div className="classes-grid">
                    {availableClasses.map((className) => {
                        const isSelected = selectedClasses.includes(className)

                        return (
                            <label key={className} className="class-checkbox">
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => onClassToggle(className)}
                                />
                                <span>{className}</span>
                            </label>
                        )
                    })}
                </div>
                <p className="control-note">{selectedClasses.length} classes selected</p>
            </div>

            <div className="control-group">
                <label className="control-label" htmlFor="loi-slider">
                    LOI Height ({loiHeight}px)
                </label>
                <input
                    id="loi-slider"
                    className="loi-slider"
                    type="range"
                    min={0}
                    max={Math.max(loiMax, 1)}
                    value={Math.min(loiHeight, Math.max(loiMax, 1))}
                    onChange={(event) => onLoiHeightChange(Number(event.target.value))}
                />
                <p className="control-note">Range: 0 to {Math.max(loiMax, 1)} px (video height)</p>
            </div>

            <button type="button" className="ghost-button" onClick={onSetConfig}>
                Set Configuration
            </button>

            {configStatus && (
                <p className="control-note success-status" style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>
                    {configStatus}
                </p>
            )}
        </section>
    )
}

export default AnalysisControlsPanel
