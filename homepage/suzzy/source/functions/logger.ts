import { inspect } from 'util'

export default function Log(
    severity: 'FATAL' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'DATA',
    service: string,
    message: string,
    data?: any
) {
    const d = new Date()
    const t = `${d.toDateString().slice(4)} ${d.toTimeString().slice(0, 8)}`
    process.stdout.write(`${t} [${severity}] ${service}: ${message}\x1b[0m\n`)
    if (data) {
        process.stdout.write(inspect(data, false, Infinity, true))
        process.stdout.write('\n---\n\n')
    }
    if (severity === 'FATAL') process.exit(1)
}