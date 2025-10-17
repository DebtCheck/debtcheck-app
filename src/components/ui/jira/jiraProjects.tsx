import { Projects } from "@/types/jira";
import JiraButtons from "./jiraButtons";
import { Report } from "@/types/report";

type Props = Projects & {
  report: Report | null;
}

export default function ProjectCards({ values, report }: Props) {
  
  if (!values?.length) {
    return <p className="text-gray-600">No Jira projects found.</p>;
  }

  return (
    <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {values.map((project) => (
        <div
          key={project.id}
          id={project.id}
          className="rounded-2xl border bg-white shadow p-4 flex flex-col justify-between"
        >
          <div className="flex items-center gap-4">
            {project.avatarUrls?.["48x48"] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={project.avatarUrls["48x48"]}
                alt={`${project.name} avatar`}
                className="w-12 h-12 rounded-md"
              />
            )}
            <div>
              <h2 className="text-lg font-bold">{project.name}</h2>
              <p className="text-sm text-gray-500">Key: {project.key}</p>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-700 space-y-1">
            <p><strong>Type:</strong> {project.projectTypeKey}</p>
            <p><strong>Style:</strong> {project.style}</p>
            <p>
              <strong>Privacy:</strong>{" "}
              {project.isPrivate ? "Private" : "Public"}
            </p>
            <p>
              <strong>Simplified:</strong>{" "}
              {project.simplified ? "Yes" : "No"}
            </p>
          </div>
          <JiraButtons projectId={project.id} report={report}  />
        </div>

        
      ))}
    </div>
  );
}