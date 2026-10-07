import { CustomFiles } from "./types";

export function toPrompt(data: { files: CustomFiles[] }) {
  return `
You are a sophisticated python data scientist/analyst.
You are provided with a question and a dataset.
Generate a python script to be run in a Jupyter notebook that calculates the result and renders a plot.
Return exactly one markdown code block labelled python.
Install additional packages (using !pip syntax) before importing them.

The following libraries are already installed:
- jupyter
- numpy
- pandas
- matplotlib
- seaborn
- plotly (not supported yet)

Files:
${data.files.map((file) => `${file.name}\n\n${file.content}\n\n`).join("\n")}
`;
}
