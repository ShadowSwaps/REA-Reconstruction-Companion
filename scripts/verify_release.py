"""Verify and test the built release ZIP using existing Python and Node runtimes."""
from pathlib import Path, PurePosixPath
import hashlib
import json
import re
import subprocess
import tempfile
import zipfile


def verify(archive, root):
    manifest_bytes = (root / 'manifest.json').read_bytes()
    manifest = json.loads(manifest_bytes)
    version = manifest['version']
    if not re.fullmatch(r'\d+\.\d+\.\d+', version):
        raise ValueError('Unsupported release version')
    stem = f'REA-Reconstruction-Companion-{version}'
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    if archive.with_suffix('.sha256').read_text().split() != [digest, archive.name]:
        raise ValueError('Release checksum mismatch')
    expected = {f'{stem}/{name}' for name in manifest['files']} | {f'{stem}/manifest.json'}
    with zipfile.ZipFile(archive) as bundle:
        if len(bundle.namelist()) != len(expected) or set(bundle.namelist()) != expected or bundle.testzip() is not None:
            raise ValueError('Release entry mismatch')
        # Compare to the checked-out manifest/source before writing or executing.
        payload = {}
        for name in expected:
            relative = name[len(stem) + 1:]
            parts = PurePosixPath(relative).parts
            if not parts or relative.startswith('/') or '\\' in relative or ':' in relative or '..' in parts:
                raise ValueError('Unsafe release path')
            data = bundle.read(name)
            if data != root.joinpath(*parts).read_bytes():
                raise ValueError('Release/source mismatch')
            if relative != 'manifest.json' and hashlib.sha256(data).hexdigest() != manifest['files'][relative]:
                raise ValueError('Release manifest mismatch')
            payload[relative] = data
    print(f'Verified release: {archive.name}, SHA-256 {digest}, {len(payload)} files', flush=True)
    return stem, payload


def main():
    root = Path(__file__).resolve().parent.parent
    manifest = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))
    archive = root / 'dist' / f"REA-Reconstruction-Companion-{manifest['version']}.zip"
    stem, payload = verify(archive, root)
    # Owned temporary files only; no installation, target execution or networking.
    with tempfile.TemporaryDirectory(prefix='rea-release-verification-') as temporary:
        package = Path(temporary) / stem
        package.mkdir()
        for relative, data in payload.items():
            target = package.joinpath(*PurePosixPath(relative).parts)
            target.parent.mkdir(parents=True, exist_ok=True)
            with target.open('xb') as output:
                output.write(data)
        subprocess.run(['node', 'scripts/test.mjs'], cwd=package, check=True)


if __name__ == '__main__':
    main()
