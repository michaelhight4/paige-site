# Quality rules pending (to merge into /workspace/quality once it is recovered)

Added in build 7c6:

- **R-7c6-1 Labels: no repeated values.** A button label never shows the same value twice (for example, the price appears once). All action labels are checked automatically by tests/build7c6.mjs §6, which scans the interaction labels and every data/*.json label/title.
- **R-7c6-2 Money sign and colour.** Sign and colour always agree, including the compact suffix ("-$1,234,567 (-1.23 mil)"). `kv()` forces red on any value that starts with a minus. Tests: bignum_ui, advisor_pnl_ui.
- **R-7c6-3 Big numbers, no sideways scroll.** Values of 1B or more use the compact form ("$172.59 sept"), and tapping one shows the full number. No screen scrolls sideways at 390px. Tests: bignum_ui, advisor_pnl_ui.
