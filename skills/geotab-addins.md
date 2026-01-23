# Geotab Add-Ins Skill

This directory contains an Agent Skills-formatted skill for building Geotab Add-Ins.

## Using This Skill

The full skill has been converted to the [Agent Skills](https://agentskills.io) standard format and is available at:

**[skills/geotab-addins/SKILL.md](geotab-addins/SKILL.md)**

This skill teaches AI assistants how to:
- Build custom Add-Ins that extend the MyGeotab interface
- Use the MyGeotab JavaScript API
- Deploy Add-Ins to GitHub Pages
- Handle common pitfalls and debugging issues

## What Changed?

This file previously contained the full skill content inline. It has now been restructured to follow the Agent Skills specification with:

- **YAML frontmatter** - Metadata that helps AI assistants know when to use this skill
- **Structured content** - Organized instructions optimized for AI consumption
- **Progressive disclosure** - Core instructions in SKILL.md, with option to add references/, scripts/, and assets/ directories

## How to Use

### With Claude Code

```bash
# The skill is automatically available in this repository
# Just ask Claude to use it:
claude "Using the geotab-addins skill, help me build a fleet dashboard Add-In"
```

### With Other AI Tools

Point your AI tool to this skill:

```
Read skills/geotab-addins/SKILL.md and help me build a Geotab Add-In
```

## Learn More

- [Agent Skills Specification](https://agentskills.io/specification)
- [Creating Agent Skills Guide](../guides/CREATING_AGENT_SKILLS.md)
- [Geotab Add-Ins Official Documentation](https://developers.geotab.com/myGeotab/addIns/developingAddIns/)
