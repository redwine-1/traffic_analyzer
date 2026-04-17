type AnalysisStatsBarProps = {
    frameNumber: number
    upCount: number
    downCount: number
    upBreakdown: Record<string, number>
    downBreakdown: Record<string, number>
    progressPercent: number
}

function AnalysisStatsBar({ frameNumber, upCount, downCount, upBreakdown, downBreakdown, progressPercent }: AnalysisStatsBarProps) {
    const renderBreakdown = (breakdown: Record<string, number>) => {
        const entries = Object.entries(breakdown)
        if (entries.length === 0) return null

        return (
            <span style={{ fontSize: '0.9rem', color: '#64748b', marginLeft: '0.75rem', fontWeight: 500 }}>
                ({entries.map(([key, value]) => `${key}: ${value}`).join(', ')})
            </span>
        )
    }

    return (
        <section className="analysis-stats" aria-label="Video analysis stats">
            <div className="stat-card">
                <p className="stat-label">Frame</p>
                <p className="stat-value">{frameNumber}</p>
            </div>
            <div className="stat-card">
                <p className="stat-label">Up</p>
                <p className="stat-value">
                    {upCount}
                    {renderBreakdown(upBreakdown)}
                </p>
            </div>
            <div className="stat-card">
                <p className="stat-label">Down</p>
                <p className="stat-value">
                    {downCount}
                    {renderBreakdown(downBreakdown)}
                </p>
            </div>
            <div className="stat-card">
                <p className="stat-label">Progress</p>
                <p className="stat-value">{progressPercent.toFixed(1)}%</p>
            </div>
        </section>
    )
}

export default AnalysisStatsBar
