"""Build the release ZIP from the explicit manifest using Python's standard library."""
from pathlib import Path, PurePosixPath
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parent.parent
manifest = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))
payload = {}
for relative, expected in manifest['files'].items():
    parts = PurePosixPath(relative).parts
    if not parts or relative.startswith('/') or '\\' in relative or ':' in relative or '..' in parts:
        raise ValueError(f'Unsafe manifest path: {relative}')
    source = root.joinpath(*parts)
    if source.is_symlink() or not source.resolve().is_relative_to(root):
        raise ValueError(f'Unsafe source path: {relative}')
    data = source.read_bytes()
    if hashlib.sha256(data).hexdigest() != expected:
        raise ValueError(f'Stale manifest: {relative}. Run node scripts/manifest.mjs first.')
    payload[relative] = data
payload['manifest.json'] = (root / 'manifest.json').read_bytes()
out = root / 'dist'
out.mkdir(exist_ok=True)
stem = f"REA-Reconstruction-Companion-{manifest['version']}"
archive = out / f'{stem}.zip'
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED) as bundle:
    for relative, data in sorted(payload.items()):
        info = zipfile.ZipInfo(f'{stem}/{relative}', date_time=(2026, 10, 15, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        bundle.writestr(info, data)
with zipfile.ZipFile(archive) as bundle:
    assert bundle.testzip() is None
    for relative, data in payload.items():
        assert bundle.read(f'{stem}/{relative}') == data
checksum = hashlib.sha256(archive.read_bytes()).hexdigest()
(out / f'{stem}.sha256').write_text(f'{checksum}  {archive.name}\n', encoding='utf-8')
print(f'{archive.name}: {len(payload)} files, {archive.stat().st_size} bytes, SHA-256 {checksum}')
