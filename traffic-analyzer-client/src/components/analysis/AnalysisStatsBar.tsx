type AnalysisStatsBarProps = {
    frameNumber: number
    upCount: number
    downCount: number
    selectedClassCount: number
}

function AnalysisStatsBar({ frameNumber, upCount, downCount, selectedClassCount }: AnalysisStatsBarProps) {
    return (
        <section className="analysis-stats" aria-label="Video analysis stats">
            <div className="stat-card">
                <p className="stat-label">Frame</p>
                <p className="stat-value">{frameNumber}</p>
            </div>
            <div className="stat-card">
                <p className="stat-label">Up</p>
                <p className="stat-value">{upCount}</p>
            </div>
            <div className="stat-card">
                <p className="stat-label">Down</p>
                <p className="stat-value">{downCount}</p>
            </div>
            <div className="stat-card">
                <p className="stat-label">Selected Classes</p>
                <p className="stat-value">{selectedClassCount}</p>
            </div>
        </section>
    )
}

export default AnalysisStatsBar
