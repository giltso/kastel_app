import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'
import { Id } from '../convex/_generated/dataModel'

export const Route = createFileRoute('/test-shifts')({
  component: TestShiftsPage,
})

function TestShiftsPage() {
  const [testDate] = useState('2025-09-22') // Next Monday
  const [testResults, setTestResults] = useState<any>(null)
  const [demoIds, setDemoIds] = useState<any>(null)

  // Mutations
  const createDemoUsers = useMutation(api.test_shifts.createDemoUsers)
  const createDemoShiftTemplate = useMutation(api.test_shifts.createDemoShiftTemplate)
  const testManagerAssignsWorker = useMutation(api.test_shifts.testManagerAssignsWorker)
  const testWorkerApprovesAssignment = useMutation(api.test_shifts.testWorkerApprovesAssignment)
  const testWorkerRequestsJoinShift = useMutation(api.test_shifts.testWorkerRequestsJoinShift)
  const testManagerApprovesRequest = useMutation(api.test_shifts.testManagerApprovesRequest)
  const cleanupDemoData = useMutation(api.test_shifts.cleanupDemoData)

  // Queries
  const demoDataOverview = useQuery(api.test_shifts.getDemoDataOverview)
  const getTestResults = useQuery(api.test_shifts.getTestResults, { testDate })

  const runTest1_CreateDemoData = async () => {
    try {
      console.log("🚀 Creating demo users...")
      const users = await createDemoUsers()

      console.log("🚀 Creating demo shift template...")
      const shiftId = await createDemoShiftTemplate({ managerId: users.managerId })

      setDemoIds({
        managerId: users.managerId,
        workers: users.workers,
        shiftId
      })

      setTestResults({
        step: "Demo data created",
        users: users.created,
        shiftId
      })

      console.log("✅ Test 1 Complete: Demo data created")
    } catch (error) {
      console.error("❌ Test 1 Failed:", error)
      setTestResults({ error: String(error) })
    }
  }

  const runTest2_ManagerAssignsWorker = async () => {
    if (!demoIds) {
      alert("Please run Test 1 first to create demo data")
      return
    }

    try {
      console.log("🚀 Manager assigns Alice to Monday shift...")
      const result = await testManagerAssignsWorker({
        managerId: demoIds.managerId,
        workerId: demoIds.workers[0], // Alice
        shiftId: demoIds.shiftId,
        testDate,
      })

      setTestResults({
        step: "Manager assigned worker",
        assignmentId: result.assignmentId,
        scenario: result.scenario
      })

      console.log("✅ Test 2 Complete: Manager assignment created")
    } catch (error) {
      console.error("❌ Test 2 Failed:", error)
      setTestResults({ error: String(error) })
    }
  }

  const runTest3_WorkerApprovesAssignment = async () => {
    if (!testResults?.assignmentId) {
      alert("Please run Test 2 first to create an assignment")
      return
    }

    try {
      console.log("🚀 Alice approves her assignment...")
      const result = await testWorkerApprovesAssignment({
        assignmentId: testResults.assignmentId
      })

      setTestResults({
        step: "Worker approved assignment",
        ...result
      })

      console.log("✅ Test 3 Complete: Worker approved assignment")
    } catch (error) {
      console.error("❌ Test 3 Failed:", error)
      setTestResults({ error: String(error) })
    }
  }

  const runTest4_WorkerRequestsJoinShift = async () => {
    if (!demoIds) {
      alert("Please run Test 1 first to create demo data")
      return
    }

    try {
      console.log("🚀 Bob requests to join Monday shift...")
      const result = await testWorkerRequestsJoinShift({
        workerId: demoIds.workers[1], // Bob
        shiftId: demoIds.shiftId,
        testDate,
      })

      setTestResults({
        step: "Worker requested to join shift",
        requestId: result.requestId,
        scenario: result.scenario
      })

      console.log("✅ Test 4 Complete: Worker join request created")
    } catch (error) {
      console.error("❌ Test 4 Failed:", error)
      setTestResults({ error: String(error) })
    }
  }

  const runTest5_ManagerApprovesRequest = async () => {
    if (!testResults?.requestId || !demoIds) {
      alert("Please run Test 4 first to create a request")
      return
    }

    try {
      console.log("🚀 Manager approves Bob's join request...")
      const result = await testManagerApprovesRequest({
        requestId: testResults.requestId,
        managerId: demoIds.managerId,
      })

      setTestResults({
        step: "Manager approved worker request",
        ...result
      })

      console.log("✅ Test 5 Complete: Manager approved request and created assignment")
    } catch (error) {
      console.error("❌ Test 5 Failed:", error)
      setTestResults({ error: String(error) })
    }
  }

  const runCleanup = async () => {
    try {
      console.log("🧹 Cleaning up demo data...")
      const result = await cleanupDemoData()
      setDemoIds(null)
      setTestResults({ step: "Cleanup complete", ...result })
      console.log("✅ Cleanup Complete")
    } catch (error) {
      console.error("❌ Cleanup Failed:", error)
      setTestResults({ error: String(error) })
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">🧪 V2 Shift System Testing</h1>
        <p className="text-base-content/70">
          Validate the complete dual approval workflow and population-based shift system
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Controls */}
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h2 className="card-title text-xl mb-4">🎮 Test Controls</h2>

            <div className="space-y-3">
              <button
                className="btn btn-primary w-full"
                onClick={runTest1_CreateDemoData}
              >
                1️⃣ Create Demo Data
              </button>

              <button
                className="btn btn-secondary w-full"
                onClick={runTest2_ManagerAssignsWorker}
                disabled={!demoIds}
              >
                2️⃣ Manager Assigns Worker
              </button>

              <button
                className="btn btn-accent w-full"
                onClick={runTest3_WorkerApprovesAssignment}
                disabled={!testResults?.assignmentId}
              >
                3️⃣ Worker Approves Assignment
              </button>

              <button
                className="btn btn-info w-full"
                onClick={runTest4_WorkerRequestsJoinShift}
                disabled={!demoIds}
              >
                4️⃣ Worker Requests Join Shift
              </button>

              <button
                className="btn btn-success w-full"
                onClick={runTest5_ManagerApprovesRequest}
                disabled={!testResults?.requestId}
              >
                5️⃣ Manager Approves Request
              </button>

              <div className="divider">Cleanup</div>

              <button
                className="btn btn-warning w-full"
                onClick={runCleanup}
              >
                🧹 Cleanup Demo Data
              </button>
            </div>
          </div>
        </div>

        {/* Test Results */}
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h2 className="card-title text-xl mb-4">📊 Test Results</h2>

            {testResults && (
              <div className="bg-base-200 p-4 rounded-lg">
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(testResults, null, 2)}
                </pre>
              </div>
            )}

            {!testResults && (
              <div className="text-center text-base-content/50 py-8">
                Run tests to see results here
              </div>
            )}
          </div>
        </div>

        {/* Demo Data Overview */}
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h2 className="card-title text-xl mb-4">👥 Demo Data Overview</h2>

            {demoDataOverview && (
              <div className="space-y-4">
                <div className="stats stats-vertical lg:stats-horizontal w-full">
                  <div className="stat">
                    <div className="stat-title">Users</div>
                    <div className="stat-value text-primary">{demoDataOverview.summary.totalUsers}</div>
                    <div className="stat-desc">{demoDataOverview.summary.managers} managers, {demoDataOverview.summary.workers} workers</div>
                  </div>

                  <div className="stat">
                    <div className="stat-title">Shifts</div>
                    <div className="stat-value text-secondary">{demoDataOverview.summary.activeShifts}</div>
                    <div className="stat-desc">Active shift templates</div>
                  </div>

                  <div className="stat">
                    <div className="stat-title">Assignments</div>
                    <div className="stat-value text-accent">{demoDataOverview.summary.totalAssignments}</div>
                    <div className="stat-desc">Total assignments</div>
                  </div>
                </div>

                {demoDataOverview.users.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Demo Users:</h3>
                    <div className="space-y-1">
                      {demoDataOverview.users.map((user: any) => (
                        <div key={user._id} className="badge badge-outline">
                          {user.name} {user.managerTag ? '(Manager)' : '(Worker)'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!demoDataOverview?.summary.totalUsers && (
              <div className="text-center text-base-content/50 py-8">
                No demo data found. Run Test 1 to create demo data.
              </div>
            )}
          </div>
        </div>

        {/* Live Test Results */}
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h2 className="card-title text-xl mb-4">📅 Live Results ({testDate})</h2>

            {getTestResults && (
              <div className="space-y-4">
                <div className="stats stats-vertical w-full">
                  <div className="stat">
                    <div className="stat-title">Assignments</div>
                    <div className="stat-value text-primary">{getTestResults.summary.totalAssignments}</div>
                    <div className="stat-desc">{getTestResults.summary.confirmedAssignments} confirmed, {getTestResults.summary.pendingAssignments} pending</div>
                  </div>

                  <div className="stat">
                    <div className="stat-title">Requests</div>
                    <div className="stat-value text-secondary">{getTestResults.summary.totalRequests}</div>
                    <div className="stat-desc">{getTestResults.summary.approvedRequests} approved, {getTestResults.summary.pendingRequests} pending</div>
                  </div>
                </div>

                {getTestResults.assignments.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Assignments:</h3>
                    <div className="space-y-2">
                      {getTestResults.assignments.map((assignment: any) => (
                        <div key={assignment._id} className="bg-base-200 p-3 rounded">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">{assignment.workerName}</div>
                              <div className="text-sm text-base-content/70">
                                {assignment.assignedHours[0]?.startTime} - {assignment.assignedHours[0]?.endTime}
                              </div>
                            </div>
                            <div className={`badge ${assignment.status === 'confirmed' ? 'badge-success' : 'badge-warning'}`}>
                              {assignment.status}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {getTestResults.requests.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Requests:</h3>
                    <div className="space-y-2">
                      {getTestResults.requests.map((request: any) => (
                        <div key={request._id} className="bg-base-200 p-3 rounded">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">{request.workerName}</div>
                              <div className="text-sm text-base-content/70">
                                {request.requestType}: {request.requestedHours?.startTime} - {request.requestedHours?.endTime}
                              </div>
                            </div>
                            <div className={`badge ${request.status === 'approved' ? 'badge-success' : 'badge-warning'}`}>
                              {request.status}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!getTestResults?.summary.totalAssignments && !getTestResults?.summary.totalRequests && (
              <div className="text-center text-base-content/50 py-8">
                No data for {testDate}. Run tests to create assignments and requests.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Test Scenario Description */}
      <div className="card bg-base-100 border border-base-300 mt-6">
        <div className="card-body">
          <h2 className="card-title text-xl mb-4">📋 Test Scenarios</h2>

          <div className="prose prose-sm max-w-none">
            <h3>What This Tests:</h3>
            <ul>
              <li><strong>Demo Shift Template:</strong> Monday operations with 3 workers (9AM-12PM) and 4 workers (12PM-7PM)</li>
              <li><strong>Manager Assignment Flow:</strong> Manager assigns Alice to full day (9AM-5PM) → pending worker approval</li>
              <li><strong>Worker Approval:</strong> Alice approves assignment → status becomes confirmed</li>
              <li><strong>Worker Request Flow:</strong> Bob requests afternoon shift (12PM-7PM) → pending manager approval</li>
              <li><strong>Manager Approval:</strong> Manager approves Bob's request → creates confirmed assignment automatically</li>
            </ul>

            <h3>Expected Results:</h3>
            <ul>
              <li>✅ 2 confirmed assignments for {testDate}</li>
              <li>✅ 1 approved request</li>
              <li>✅ Dual approval workflow working correctly</li>
              <li>✅ Population-based shift requirements validated</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}