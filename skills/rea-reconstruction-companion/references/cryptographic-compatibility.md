# Cryptographic compatibility

For encrypted formats or interfaces, read [cryptographic compatibility](cryptographic-compatibility.md) to recover an explicit interoperability profile and select independent acceptance/rejection vectors. A known algorithm does not imply available keys or a decryption capability.

Use for an encrypted format, database field, message, or protocol within the selected target. This is compatibility and validation guidance, not a universal decryptor or authorization to acquire secrets. Distinguish encryption from encoding, compression, hashing, authentication, and signatures before choosing a method. Prefer the platform's established cryptographic library; do not invent or reimplement a cipher to reconstruct an application.

## Interoperability profile

Record each relevant field with its evidence source and status: observed, inferred, unknown, or proposed. Preserve the exact target/version and byte-level examples using synthetic or authorized non-sensitive fixtures.

| Field | What to establish |
| --- | --- |
| Primitive and variant | Algorithm, mode, exact variant and parameters; similarly named variants can have different nonce sizes or layouts. |
| Key representation | Required length and byte encoding, plus a reference to the authorized source or key identifier. Never include actual user keys/passwords in reports, fixtures, logs, or source control. |
| Derivation | KDF and version, salt representation, context/info, iteration/work factors, memory and parallelism where applicable. HKDF is not a password-hardening substitute. |
| Nonce/IV | Length, encoding, generation/uniqueness rules, placement, and per-message or per-chunk behavior. Do not reuse test nonces/keys for real encryption. |
| Authentication | Tag length and placement, exact AAD bytes/order, verification and failure behavior. Plaintext must not be accepted or released as authenticated before verification succeeds. |
| Padding and serialization | Padding only where the mode uses it; byte order, text encoding, base64 variant, separators and length fields. Preserve bytes rather than guessing from displayed text. |
| Envelope and state | Schema/format versions, headers, chunk sequence/final markers when present, and relevant key-selection/rotation identifiers. |

These fields follow the AEAD interface and applicable derivation/variant specifications. [R20](research-basis.md#r20-cryptographic-interoperability) An algorithm name or high-entropy blob does not establish a full profile. Unknown parameters or unavailable authorized keys may prevent decryption; report that limit rather than promise recovery, brute-force secrets, weaken authentication, or silently choose defaults. Apply the no-additional-charges constraint to any proposed analysis tool or service.

Keep two records when necessary: the observed legacy compatibility requirement and a proposed safer design for newly created data. Do not silently replace a required wire format, reproduce a vulnerability without discussion, or claim that matching legacy behavior is a security endorsement. AEAD by itself does not establish replay protection, authorization, or safe key management.

## Independent vectors and rejection tests

Select known-answer vectors from the applicable standard, the library's maintained test corpus, or an independent implementation. Record source, version, provenance/license if copying, expected bytes, and exact profile. Public synthetic vector keys are test data and must be clearly labeled; never substitute real user secrets. Do not add a tool or download a large corpus automatically. [R21](research-basis.md#r21-cryptographic-test-vectors)

Check encryption and decryption independently against published expected outputs where applicable. A writer/reader self-roundtrip can share the same error and is insufficient. Cover empty/boundary inputs, exact encodings, tag/AAD layout, and format versions. Verify interoperability in both required directions with the real reference or a named independent implementation when available.

Use relevant negative cases: changed ciphertext, wrong key/nonce/tag/AAD, missing or truncated fields, invalid lengths, unsupported versions, and chunk reorder/truncation or missing final marker if the format provides those protections. Assert rejection and no accepted plaintext or committed state after authentication failure. Do not demand AEAD rejection properties from an unauthenticated legacy cipher; identify that security limitation explicitly instead.

Report vector results, rejection behavior, coverage gaps, and exact library/runtime version. Finite vectors, roundtrips, or interoperability checks do not prove general cryptographic security, absence of side channels, or safe deployment. Keep unresolved security and compatibility questions visible.
