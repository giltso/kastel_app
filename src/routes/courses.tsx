import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { usePermissions } from "@/hooks/usePermissions";
import { useState } from "react";
import { Plus, GraduationCap, Users, Calendar, Clock, MapPin, DollarSign, BookOpen } from "lucide-react";
import type { Doc, Id } from "../../convex/_generated/dataModel";

export const Route = createFileRoute("/courses")({
  component: CoursesPage,
});

function CoursesPage() {
  const { hasPermission } = usePermissions();
  const isOperational = hasPermission("access_worker_portal");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <GraduationCap className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Courses</h1>
          <p className="text-lg opacity-80">
            {isOperational 
              ? "Manage educational courses and training programs"
              : "Browse available courses and manage your enrollments"
            }
          </p>
        </div>
      </div>

      {isOperational ? <OperationalView /> : <CustomerView />}
    </div>
  );
}

function OperationalView() {
  const [activeTab, setActiveTab] = useState<"courses" | "enrollments">("courses");
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  
  const courses = useQuery(api.courses.listCourses);

  const stats = {
    totalCourses: courses?.length || 0,
    totalEnrollments: courses?.reduce((sum, course) => sum + ((course as any).enrollments?.length || 0), 0) || 0,
  };

  return (
    <div className="not-prose space-y-6">
      <div className="flex justify-between items-center">
        <button
          onClick={() => setIsAddCourseModalOpen(true)}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4" />
          Create Course
        </button>
        
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-figure text-primary">
              <BookOpen className="w-8 h-8" />
            </div>
            <div className="stat-title">Total Courses</div>
            <div className="stat-value">{stats.totalCourses}</div>
          </div>
          
          <div className="stat">
            <div className="stat-figure text-secondary">
              <Users className="w-8 h-8" />
            </div>
            <div className="stat-title">Total Enrollments</div>
            <div className="stat-value">{stats.totalEnrollments}</div>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("courses")}
          className={`btn ${activeTab === "courses" ? "btn-active" : ""}`}
        >
          <BookOpen className="w-4 h-4" />
          Courses ({stats.totalCourses})
        </button>
        <button
          onClick={() => setActiveTab("enrollments")}
          className={`btn ${activeTab === "enrollments" ? "btn-active" : ""}`}
        >
          <Users className="w-4 h-4" />
          Enrollments ({stats.totalEnrollments})
        </button>
      </div>

      {activeTab === "courses" ? (
        <CoursesTable courses={courses} />
      ) : (
        <EnrollmentsTable courses={courses} />
      )}

      {isAddCourseModalOpen && (
        <CreateCourseModal onClose={() => setIsAddCourseModalOpen(false)} />
      )}
    </div>
  );
}

function CustomerView() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  const courses = useQuery(api.courses.listCourses);
  const userEnrollments = useQuery(api.courses.getUserEnrollments);
  
  const categories = Array.from(
    new Set(courses?.map(course => course.category) || [])
  );

  const filteredCourses = courses?.filter(course => 
    selectedCategory === "all" || course.category === selectedCategory
  );

  return (
    <div className="not-prose space-y-6">
      <div className="tabs tabs-boxed">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`tab ${selectedCategory === "all" ? "tab-active" : ""}`}
        >
          All Courses
        </button>
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`tab ${selectedCategory === category ? "tab-active" : ""}`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses?.map(course => (
          <CourseCard
            key={course._id}
            course={course}
            userEnrollment={(course as any).userEnrollment}
          />
        ))}
      </div>

      {userEnrollments && userEnrollments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">My Enrollments</h2>
          <div className="grid gap-4">
            {userEnrollments.map(enrollment => (
              <div key={enrollment._id} className="card bg-base-200 shadow-sm">
                <div className="card-body">
                  <h3 className="card-title">{enrollment.course?.title}</h3>
                  <div className="flex flex-wrap gap-4 text-sm opacity-70">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {enrollment.course?.startDate} - {enrollment.course?.endDate}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {enrollment.course?.startTime} - {enrollment.course?.endTime}
                    </div>
                    {enrollment.course?.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {enrollment.course.location}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <div className={`badge ${getEnrollmentStatusBadgeClass(enrollment.status)}`}>
                      {enrollment.status}
                    </div>
                    <div className={`badge ${getPaymentStatusBadgeClass(enrollment.paymentStatus)}`}>
                      {enrollment.paymentStatus}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CoursesTable({ courses }: { courses: any[] | undefined }) {
  if (!courses) return <div className="loading loading-spinner"></div>;

  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra w-full">
        <thead>
          <tr>
            <th>Course</th>
            <th>Schedule</th>
            <th>Enrollments</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {courses.map(course => (
            <tr key={course._id}>
              <td>
                <div className="flex flex-col">
                  <div className="font-bold">{course.title}</div>
                  <div className="text-sm opacity-50">
                    {course.category} • {course.skillLevel}
                  </div>
                  {course.instructor && (
                    <div className="text-xs opacity-40">
                      Instructor: {course.instructor.name}
                    </div>
                  )}
                </div>
              </td>
              <td>
                <div className="text-sm">
                  <div>{course.startDate} - {course.endDate}</div>
                  <div className="opacity-50">{course.startTime} - {course.endTime}</div>
                  <div className="opacity-40">{course.location}</div>
                </div>
              </td>
              <td>
                <div className="text-center">
                  <div className="text-lg font-bold">
                    {course.currentParticipants}/{course.maxParticipants}
                  </div>
                  <div className="text-xs opacity-50">enrolled</div>
                </div>
              </td>
              <td>
                <div className={`badge ${course.isActive ? 'badge-success' : 'badge-neutral'}`}>
                  {course.isActive ? 'Active' : 'Inactive'}
                </div>
              </td>
              <td>
                <div className="flex gap-2">
                  <button className="btn btn-sm btn-ghost">
                    <BookOpen className="w-4 h-4" />
                  </button>
                  <button className="btn btn-sm btn-ghost">
                    <Users className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EnrollmentsTable({ courses }: { courses: any[] | undefined }) {
  if (!courses) return <div className="loading loading-spinner"></div>;

  const allEnrollments = courses.flatMap(course => 
    course.enrollments?.map((enrollment: any) => ({
      ...enrollment,
      courseTitle: course.title
    })) || []
  );

  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra w-full">
        <thead>
          <tr>
            <th>Student</th>
            <th>Course</th>
            <th>Enrollment Date</th>
            <th>Status</th>
            <th>Payment</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {allEnrollments.map(enrollment => (
            <tr key={enrollment._id}>
              <td>
                <div className="flex flex-col">
                  <div className="font-bold">{enrollment.student?.name || 'Unknown'}</div>
                  <div className="text-sm opacity-50">{enrollment.student?.email}</div>
                </div>
              </td>
              <td>{enrollment.courseTitle}</td>
              <td>{enrollment.enrollmentDate}</td>
              <td>
                <div className={`badge ${getEnrollmentStatusBadgeClass(enrollment.status)}`}>
                  {enrollment.status}
                </div>
              </td>
              <td>
                <div className={`badge ${getPaymentStatusBadgeClass(enrollment.paymentStatus)}`}>
                  {enrollment.paymentStatus}
                </div>
              </td>
              <td>
                <EnrollmentActions enrollment={enrollment} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CourseCard({ course, userEnrollment }: { 
  course: any, 
  userEnrollment?: any 
}) {
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);

  const canEnroll = !userEnrollment && 
    course.spotsAvailable > 0 && 
    new Date(course.startDate) > new Date();

  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body">
        <h3 className="card-title">{course.title}</h3>
        <p className="text-sm opacity-70 line-clamp-3">{course.description}</p>
        
        <div className="flex flex-wrap gap-2 text-sm opacity-60">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {course.startDate}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {course.startTime}
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            {course.location}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1 text-lg font-bold">
            <DollarSign className="w-4 h-4" />
            {course.price}
          </div>
          <div className="text-sm">
            {course.spotsAvailable} spots left
          </div>
        </div>

        <div className="flex gap-2">
          <div className={`badge badge-outline ${getSkillLevelBadgeClass(course.skillLevel)}`}>
            {course.skillLevel}
          </div>
          <div className="badge badge-secondary">{course.category}</div>
        </div>

        <div className="card-actions justify-end">
          {userEnrollment ? (
            <div className={`badge ${getEnrollmentStatusBadgeClass(userEnrollment.status)}`}>
              {userEnrollment.status}
            </div>
          ) : canEnroll ? (
            <button
              onClick={() => setIsEnrollmentModalOpen(true)}
              className="btn btn-primary btn-sm"
            >
              Enroll Now
            </button>
          ) : (
            <button className="btn btn-disabled btn-sm">
              {course.spotsAvailable === 0 ? 'Full' : 'Past Date'}
            </button>
          )}
        </div>
      </div>

      {isEnrollmentModalOpen && (
        <EnrollmentRequestModal
          course={course}
          onClose={() => setIsEnrollmentModalOpen(false)}
        />
      )}
    </div>
  );
}

function CreateCourseModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    skillLevel: "beginner" as "beginner" | "intermediate" | "advanced",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    location: "",
    maxParticipants: 10,
    price: 0,
    syllabus: [""],
    materials: [""]
  });

  const createCourse = useMutation(api.courses.createCourse);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCourse({
        ...formData,
        syllabus: formData.syllabus.filter(item => item.trim()),
        materials: formData.materials.filter(item => item.trim())
      });
      onClose();
    } catch (error) {
      console.error("Failed to create course:", error);
    }
  };

  const addArrayItem = (field: 'syllabus' | 'materials') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], ""]
    }));
  };

  const updateArrayItem = (field: 'syllabus' | 'materials', index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  return (
    <dialog open className="modal">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg">Create New Course</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Course Title</label>
              <input
                type="text"
                className="input input-bordered w-full"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Category</label>
              <input
                type="text"
                className="input input-bordered w-full"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="textarea textarea-bordered w-full"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Skill Level</label>
              <select
                className="select select-bordered w-full"
                value={formData.skillLevel}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  skillLevel: e.target.value as "beginner" | "intermediate" | "advanced"
                }))}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="label">Max Participants</label>
              <input
                type="number"
                min="1"
                className="input input-bordered w-full"
                value={formData.maxParticipants}
                onChange={(e) => setFormData(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) }))}
                required
              />
            </div>
            <div>
              <label className="label">Price ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input input-bordered w-full"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                className="input input-bordered w-full"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">End Date</label>
              <input
                type="date"
                className="input input-bordered w-full"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Start Time</label>
              <input
                type="time"
                className="input input-bordered w-full"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">End Time</label>
              <input
                type="time"
                className="input input-bordered w-full"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Location</label>
              <input
                type="text"
                className="input input-bordered w-full"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Syllabus</label>
            {formData.syllabus.map((item, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  className="input input-bordered flex-1"
                  placeholder={`Topic ${index + 1}`}
                  value={item}
                  onChange={(e) => updateArrayItem('syllabus', index, e.target.value)}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('syllabus')}
              className="btn btn-outline btn-sm"
            >
              + Add Topic
            </button>
          </div>

          <div>
            <label className="label">Materials Provided</label>
            {formData.materials.map((item, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  className="input input-bordered flex-1"
                  placeholder={`Material ${index + 1}`}
                  value={item}
                  onChange={(e) => updateArrayItem('materials', index, e.target.value)}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('materials')}
              className="btn btn-outline btn-sm"
            >
              + Add Material
            </button>
          </div>

          <div className="modal-action">
            <button type="button" onClick={onClose} className="btn">Cancel</button>
            <button type="submit" className="btn btn-primary">Create Course</button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

function EnrollmentRequestModal({ course, onClose }: { 
  course: any,
  onClose: () => void 
}) {
  const requestEnrollment = useMutation(api.courses.requestCourseEnrollment);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await requestEnrollment({ courseId: course._id });
      onClose();
    } catch (error) {
      console.error("Failed to request enrollment:", error);
    }
  };

  return (
    <dialog open className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Request Course Enrollment</h3>
        
        <div className="py-4">
          <h4 className="font-semibold">{course.title}</h4>
          <p className="text-sm opacity-70">{course.description}</p>
          
          <div className="mt-4 space-y-2 text-sm">
            <div><strong>Duration:</strong> {course.startDate} - {course.endDate}</div>
            <div><strong>Time:</strong> {course.startTime} - {course.endTime}</div>
            <div><strong>Location:</strong> {course.location}</div>
            <div><strong>Skill Level:</strong> {course.skillLevel}</div>
            <div><strong>Price:</strong> ${course.price}</div>
            <div><strong>Available Spots:</strong> {course.spotsAvailable}</div>
          </div>
        </div>

        <div className="modal-action">
          <button onClick={onClose} className="btn">Cancel</button>
          <button onClick={handleSubmit} className="btn btn-primary">
            Request Enrollment
          </button>
        </div>
      </div>
    </dialog>
  );
}

function EnrollmentActions({ enrollment }: { enrollment: any }) {
  const updateStatus = useMutation(api.courses.updateEnrollmentStatus);

  const handleStatusUpdate = async (status: string) => {
    try {
      await updateStatus({ 
        enrollmentId: enrollment._id, 
        status: status as any
      });
    } catch (error) {
      console.error("Failed to update enrollment status:", error);
    }
  };

  if (enrollment.status === "pending") {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => handleStatusUpdate("approved")}
          className="btn btn-success btn-xs"
        >
          Approve
        </button>
        <button
          onClick={() => handleStatusUpdate("cancelled")}
          className="btn btn-error btn-xs"
        >
          Reject
        </button>
      </div>
    );
  }

  if (enrollment.status === "approved") {
    return (
      <button
        onClick={() => handleStatusUpdate("confirmed")}
        className="btn btn-info btn-xs"
      >
        Confirm
      </button>
    );
  }

  return <div className="text-xs opacity-50">No actions</div>;
}

function getEnrollmentStatusBadgeClass(status: string) {
  switch (status) {
    case "pending": return "badge-warning";
    case "approved": return "badge-info";
    case "confirmed": return "badge-success";
    case "completed": return "badge-success";
    case "cancelled": return "badge-error";
    case "no_show": return "badge-error";
    default: return "badge-neutral";
  }
}

function getPaymentStatusBadgeClass(status: string) {
  switch (status) {
    case "pending": return "badge-warning";
    case "paid": return "badge-success";
    case "refunded": return "badge-info";
    default: return "badge-neutral";
  }
}

function getSkillLevelBadgeClass(skillLevel: string) {
  switch (skillLevel) {
    case "beginner": return "badge-success";
    case "intermediate": return "badge-warning";
    case "advanced": return "badge-error";
    default: return "badge-neutral";
  }
}