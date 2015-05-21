fp-burg
===============

## Team Members

1. Brian Burg burg@uw.edu

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
