
# claude project integration #

## general goal ## 

this is a doc meant to help us with integrating well on this project. 

updating the state of the project is massively important, and helps getting results that span multiple sessions.


## session workflow ## 

the goal is to get a good understanding of the enviroment in which the development will happen. to do this effectively the docs should be fairaly short, and give good info for the current session.

generally, when starting a session you will be directed to read these files:

### PROJECT_OVERVIEW.md ###

read always, update on finish and after major changes are finished

if approching 5 hour limit, update these docs before doing anything else. add your current todo list to the bottom of the project_overview file  

for now read redesign_V2 as main work file for future sessions 

### session_history.md ###

read last 2 session to get context.

after that update on last session on start of new session

### a specific feature implamenteation doc ###

read all, and use as main update location during a task.

update after finishing major changes.

## task workflow ## 

general directive to major tasks, follow the order

## if apporching 5 hours limit 

- stop all development and update all docs with relevant info. 
- make a context dump to ne back on schedual. 
### show plan ### 

- read the task, if it makes sense, create todo.
- write a plan for me to approve if there are questions ask them now.
- update relevant doc to the feature, if theres no relevant doc ask for permission to make one.
- update todo.
- preform the agreed tasks. 
- report on terminal, focus on problems and unfinished tasks, emphasize source of problem.
- update doc when finished


## context dump for next session 


  1. Backend Function Recognition Investigation

  - Priority: CRITICAL - V2 role switching completely broken
  - Need to investigate why Convex runtime shows users:switchEmulatingRole when
  code calls api.users_v2.switchV2Role
  - Check if there are cached API references or build artifacts causing function
  name conflicts
  - Verify all V2 functions are properly exported and accessible in the API

  2. Schema Validation Fix

  - Priority: HIGH - User creation/updates failing
  - Resolve ArgumentValidationError: Object contains extra field 'role' in V2 user
  functions
  - Either update validators to accept legacy role field or clean migration
  strategy
  - Ensure V2 user creation works without breaking existing data

  3. Orphaned References Cleanup

  - Priority: MEDIUM - Build stability issues
  - Find and remove all remaining references to deleted suggestions.ts
  - Clear any cached TypeScript compilation artifacts
  - Ensure clean build without suggestion system errors

  4. Development Environment State

  - Current State: Development servers running, user authenticated as Claude Code
  (dev role)
  - Frontend: http://localhost:5173 - loads correctly, UI functional
  - Backend: Convex deployment active but function mapping issues
  - Database: V2 schema exists, user data present but validation failing

  Session Preparation Checklist

  Read First (Critical Context)

  - /workspaces/kastel_app/design/REDESIGN_V2.md - Phase 1 status and critical
  issues
  - /workspaces/kastel_app/design/session_history.md - Session 24 unresolved issues
  - /workspaces/kastel_app/src/components/RoleEmulator.tsx - Current implementation
  - /workspaces/kastel_app/convex/users_v2.ts - V2 backend functions

  Key Investigation Areas

  1. Function Registration: Why switchV2Role not recognized by runtime
  2. API Generation: Check if convex/_generated/api.d.ts has correct V2 functions
  3. Build Process: Verify Convex compilation completing successfully
  4. Cache Issues: Clear any cached API or function references

  Expected Session Workflow

  1. Start: Read error documentation and current implementation status
  2. Debug: Investigate backend function recognition issues
  3. Fix: Resolve schema validation and function mapping
  4. Test: Verify role switching works end-to-end with Playwright
  5. Validate: Confirm V2 system functional before proceeding to Phase 2

  Success Criteria for Next Session

  - Role emulator toggles successfully change user permissions
  - Backend logs show correct V2 function calls without errors
  - User creation/updates work with V2 schema
  - Clean build with no orphaned reference errors
  - Phase 1 foundation fully functional for Phase 2 development

  The V2 system architecture is solid and UI is working - the issues are purely
  backend integration problems that should be resolvable once the function mapping
  and schema validation are debugged.
