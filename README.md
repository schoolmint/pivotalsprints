##Overview

Pivotal Reports simply provides the complete content of a project in a tabular format to enable generation of reports using external tools such as Excel/Numbers.

Some of the main features of the export includes:

 - Conversion of member ids to member names
 - Month and week columns for pivot creation
 - Support for custom fields by adding `^ColumnName: Value` as separate lines in story description. Eg. `^Done: 70%`
 - Done is a special custom field. It's value is set to 0 or 100 depending on the current state of the story
 - Special labels `release-NUM` or `sprint-NUM` that create columns named release/sprint. Eg. `release-1.12` will add a column named `release` with value `1.12` for that story.
 - Adds epic name column to enable grouping stories by its epic
