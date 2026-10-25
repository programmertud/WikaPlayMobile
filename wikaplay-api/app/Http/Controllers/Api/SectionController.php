<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Section;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SectionController extends Controller
{
    // -----------------------------------------------------------------------
    // PUBLIC: List sections available for student enrollment
    // Only returns sections that are "active" (teacher-approved sections)
    // -----------------------------------------------------------------------
    public function publicIndex()
    {
        $sections = Section::where('status', 'active')
            ->with('teacher:id,name')
            ->orderBy('name')
            ->get()
            ->map(fn($s) => [
                'id'          => $s->id,
                'name'        => $s->name,
                'school_year' => $s->school_year,
                'teacher'     => $s->teacher ? $s->teacher->name : null,
            ]);

        return response()->json(['sections' => $sections]);
    }

    // -----------------------------------------------------------------------
    // TEACHER: List sections this teacher manages
    // -----------------------------------------------------------------------
    public function mySection(Request $request)
    {
        $teacher = $request->user();
        if (!$teacher || !$teacher->isTeacher()) {
            abort(403, 'Ang bahaging ito ay para lamang sa mga guro.');
        }

        $sections = Section::where('teacher_id', $teacher->id)
            ->withCount(['students'])
            ->orderBy('name')
            ->get()
            ->map(fn($s) => [
                'id'              => $s->id,
                'name'            => $s->name,
                'school_year'     => $s->school_year,
                'status'          => $s->status,
                'enrollment_code' => $s->enrollment_code,
                'students_count'  => $s->students_count,
            ]);

        return response()->json(['sections' => $sections]);
    }

    // -----------------------------------------------------------------------
    // TEACHER: Activate a pending section (self-approve for now)
    // In a school with an admin, only admin can call this.
    // -----------------------------------------------------------------------
    public function activate(Request $request, $id)
    {
        $teacher = $request->user();
        if (!$teacher || !$teacher->isTeacher()) {
            abort(403, 'Ang bahaging ito ay para lamang sa mga guro.');
        }

        $section = Section::findOrFail($id);

        // Only the owning teacher (or admin) can activate
        if (!$section->isOwnedBy($teacher) && !$teacher->isAdmin()) {
            abort(403, 'Wala kang pahintulot na i-activate ang seksyong ito.');
        }

        $section->update(['status' => 'active']);

        return response()->json([
            'message' => 'Matagumpay na na-activate ang seksyon. Puwede nang mag-enroll ang mga mag-aaral.',
            'section' => [
                'id'              => $section->id,
                'name'            => $section->name,
                'status'          => $section->status,
                'enrollment_code' => $section->enrollment_code,
            ],
        ]);
    }

    // -----------------------------------------------------------------------
    // TEACHER: Rotate enrollment code (security)
    // -----------------------------------------------------------------------
    public function rotateCode(Request $request, $id)
    {
        $teacher = $request->user();
        if (!$teacher || !$teacher->isTeacher()) {
            abort(403);
        }

        $section = Section::findOrFail($id);

        if (!$section->isOwnedBy($teacher) && !$teacher->isAdmin()) {
            abort(403, 'Wala kang pahintulot na baguhin ang enrollment code ng seksyong ito.');
        }

        $section->update(['enrollment_code' => Section::generateUniqueCode()]);

        return response()->json([
            'message'         => 'Nabago na ang enrollment code.',
            'enrollment_code' => $section->enrollment_code,
        ]);
    }

    // -----------------------------------------------------------------------
    // TEACHER: Archive / deactivate a section
    // -----------------------------------------------------------------------
    public function archive(Request $request, $id)
    {
        $teacher = $request->user();
        if (!$teacher || !$teacher->isTeacher()) {
            abort(403);
        }

        $section = Section::findOrFail($id);

        if (!$section->isOwnedBy($teacher) && !$teacher->isAdmin()) {
            abort(403);
        }

        $section->update(['status' => 'archived']);

        return response()->json(['message' => 'Na-archive na ang seksyon.']);
    }
}
