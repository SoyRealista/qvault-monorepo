# QVAULT Documents

Reference materials for the project. These inform engineering decisions but are not code.

| File | What it is | Use it for |
|------|-----------|-----------|
| `QVAULT_Whitepaper_v1.0.docx` | Full whitepaper (8 sections) | Source of truth for tokenomics, vision, mechanics |
| `QVAULT_Tokenomics_Model.xlsx` | 6-sheet financial model | Exact numbers: distribution, vesting, fees, scenarios |
| `QVAULT_CommunityPlaybook.docx` | Week-by-week community strategy | Marketing & launch execution |
| `QVAULT_PitchDeck.pptx` | 14-slide investor deck | Fundraising, partnerships |

## When building, defer to these for:

- **Token numbers** → Tokenomics model (xlsx) is authoritative. CLAUDE.md mirrors the key ones.
- **Staking tiers / APY** → Whitepaper §4 + model
- **Fee split** → Whitepaper §4.2 (40/20/25/15)
- **Vesting schedules** → Tokenomics model "Vesting Schedule" sheet
- **Launch sequence** → Community Playbook §2-3

If a number in code disagrees with the whitepaper/model, the whitepaper/model wins — flag the discrepancy.
