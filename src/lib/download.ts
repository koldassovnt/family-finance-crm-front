/**
 * Hands a fetched file to the browser's download flow. A temporary link is the
 * only way to give a blob a file name. The object URL is revoked on a later
 * tick rather than straight away: some browsers start reading the blob only
 * after the click handler returns, and revoking first fails the download.
 */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
