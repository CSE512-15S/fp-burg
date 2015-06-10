



A Dashboard for Navigating Test History
CSE 512 - Brian Burg - burg@cs.uw.edu

(Online at: https://brrian.org/webkit-dashboard/)

---

# Introduction

- Large software projects have many lines of code, configurations, developers, code changes.
- Tests help maintain software quality by exercising features and finding regressions.
- A single developer cannot run all tests for all configurations prior to checkin, so sometimes tests unexpectedly regress.
- Quickly triaging and fixing test regressions is necessary to maintain software quality (i.e., a "green" tree or clean test run) when changes occur frequently.
- Dashboards facilitate detection, diagnosis, and correction of test regressions and other problems.
- Particularly interested in assessing history of a test, to find past regressions and identify poor quality tests (fails often).

# Related Work

- WebKit bot watcher dashboard: the front page dashboard focuses on showing which configurations have problems.
- Flakiness dashboard: shows the same data, but poor visual encoding. Can't easily compare multiple tests across multiple platforms. Hard to use filters.
- Mozilla Oranges board: shows count over time of bugs that track known intermittent failures (orange bugs). Not 1:1 with bugs, can't see results history.

# Design Principles

- Staged workflow: find tests with issues, get more details, then jump off to other data sources.
- Small multiples and compact sparkline-like visual encoding for overview.
- Distinct patterns per sparkline, but make details small to discourage scrutiny.
- Click on a test to see interactive, full-detail graph of test history.
- Use two layouts to take advantage of vertical axis for comparison: across multiple tests for one platform, and across one test for multiple platforms.
- When looking at single test, want to see relations between runs.

# Instantiation

- Built a new dashboard based on existing dashboard design language and JSON data sources that power existing dashboard.
- Focus on visualization of test history data, less emphasis on task integration (outbound links, history) or advanced filter/search mechanisms.
- Use d3 to render sparklines, adopt MVC architecture to support faster iteration, organize views using document viewer pattern (like Xcode).

Let's deconstruct the visualizations:

- Sparkline
    + shows results of one test+builder combination for past N runs
    + time flows left to right (newest results on right edge).
    + x-scale is relative to run ordinal, not timestamp or commit number.
    + y-scale is how long it took to run the test.
    + Duration per data point shown with line, can coalesce repeats.
    + Outcome is encoded with color of line and background. Red: fail, Green: pass, Yellow: timeout, Purple: crash, clear: no data.

-FIGURE: SPARKLINE-

- Overview grid
    + One row per test.
    + One column per builder.
    + Tests without data are labeled "PASS / SKIP". In either of those cases, the current data feed format doesn't include results. See below.
    + Sorted alphabetically by test name.
    + Filter shown tests by which outcomes occur in their history.
    + Filter by test name substring.
    + Clicking a cel or row shows history for that test (see below).

-FIGURE: OVERVIEW-

- Test history grid+graph
    + One row per builder.
    + Expanded view of relevant sparklines that's interactive.
    + Hovering over one run (vertical slice) highlights the same run ordinal in other builders.
    + Clicking on a run shows popover with outbound links to the relevant commits and builder outputs.

# Challenges

- Data exists already in JSON feed, but required re-parsing into an easier to work with data model.
- Data points consist of "runs" produced by a "builder" for a configuration.
- Runs are problematic for fault diagnosis and correlation on a per-commit basis. Runs can coalesce multiple code changes (different per each builder), occur at different times.
- Results for a test are only sent if something went wrong on any run for that test.
- Hard to cross-reference against config file which says what results we expect for each test, and whether to skip tests for certain configurations.

# Discussion

- Results: more compact visual encoding, can see patterns more easily, much faster rendering.

- Surprised to see how many tests are skipped, are known to fail, etc. Raises questions of whether broken tests ever get fixed. Would be cool to know whether the skipped/broken tests are for shipping features or stubs for unsupported ones.

- Some of the skip/fail is overemphasized by the current overview because results are not cross-referenced to test expectaitons.

- Most recent runs across multiple builders have no simple relation, since builds take varying amount of time and can coalesce changes differently. So the current linked selections are misleading.

- Test-centric view is good for understanding a single test's health, or detecting widespread regressions. What's the equivalent view for specific changes? The most common question for folks not on call is, "did my recent change break anything?".

- Document viewer app pattern doesn't work well when seeing multiple views related to one thing (i.e., a test, platform, or commit). Context + tabbed browser might work better.

# Future Work

- Change/commit-centric dashboard that integrates relevant test runs, performance runs, etc. into one place.

- Better cross-reference to relevant commits, i.e, when the test was added, turned on/off.

- Support specific test improvement tasks: finding the slowest-running tests, re-enabling tests that unexpectedly passed, ...













## Project: Test History

A healthy, passing test suite is the lifeblood of any large distributed software project. A developer can use accurate, robust tests to detect failure-inducing changes before faulty code is ever committed or shipped to customers. Despite everyone's best attempts, sometimes a test may regress: to unexpectedly no longer pass. Most regressions are caused by code changes, but in other cases, the test itself is unreliable due to nondeterminism, logic errors, or other unforeseen conditions. To ensure high test suite quality, a developer must diagnose test regressions by looking through thousands of historical test results for clues as to whether the code or the test are at fault.

This CSE 512 project investigates how visualizations can aid in diagnosing test regressions in the context of [WebKit](https://www.webkit.org), an open-source browser engine with many contributors and large test suite. With presently-deployed tools, investigating test regressions is difficult: WebKit's [existing dashboard for test history](http://webkit-test-results.appspot.com/dashboards/flakiness_dashboard.html) presents a series of a large tables with poor visual encodings, hard to use filters, and other deficiencies. These problems make it difficult to discover when a test started misbehaving, to determine problems are isolated to a specific platform or time range, or to answer other straightforward questions that a developer would ask to diagnose a test regression.

### Screenshot: Existing Dashboard

![Old dashboard](https://raw.githubusercontent.com/CSE512-15S/fp-burg/master/old-dash.png)

The output of this project is a redesigned dashboard prototype that uses small multiples and compact visual encodings to succinctly present the recent history of multiple tests. The main overview shows a grid of timelines whose contents are determined by the combination of testing platform (column) and test (row). Users can filter visible timelines according to criteria such as test name, file path, platform, expected result, or date range. Timelines are interactive, and more detailed views about the particular test or build run are shown on demand.

### New Dashboard: Single Test+Platform History

![Single Timeline](https://raw.githubusercontent.com/CSE512-15S/fp-burg/master/Mockups/Timeline.png)

### New Dashboard: Grid View

![Grid View](https://raw.githubusercontent.com/CSE512-15S/fp-burg/master/Mockups/Grid.png)

## Running Instructions

Access our visualization at http://cse512-15s.github.io/fp-burg/ or download this repository and open `dashboard/testhistory.html`.

Some things to try out in the visualization:

1. TODO
