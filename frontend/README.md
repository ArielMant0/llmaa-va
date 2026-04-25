# AnnoLens

AnnoLens is an interactive visual analytics system that uses lens-based guidance to enable exploration and annotation.

## Demo

You can play with AnnoLens at [https://arielmant0.github.io/llmaa-va/](https://arielmant0.github.io/llmaa-va/).
It is recommended to use Chrome or Firefox to get the best experience.

## Manual

AnnoLens has a primary (red) and secondary (lens). When you move the primary lens,
the system will calculate the relevance of all attributes/columns in the dataset.
The most relevant column will be selected, changing the contours behind the plot and the dot's coloring.
The system will also look for another group of points with a similar relevance score for the selected column.

### Moving a lens

- Click on the lens, then it will follow your cursor
- Click on the lens again, then it will **stop** following you

### Selecting a column

- Click the **A** key or the **A** button in the hotbar to go the **previous** column
- Click the **D** key or the **D** button in the hotbar to go the **next** column
- Click on a mini-lens (next to the primary and secondary lens) to go to that column
- Click on a column label in the bar chart list to go that columns for the respective lens
- Click on the **link** between bar charts to go to that column for **both** lenses

### Annotating

- Click one of the colored buttons in the hotbar (1-5) or use the keys 1 to 5
- Click on the column label of a mini-lens to annotate that column for that lens
- Click on a bar in a bar chart to annotate the column **and** value
- Click on a colored plus icon next to an existing annotation (only visible when the cursor is over the annotation), this will also add all the data points under the selected lens to the annotation

## Installation

AnnoLens uses Vue.js + Vuetify for the page and d3.js for drawing.
To install, download the code in this repository

*Using npm*
```shell
npm install
```

*Using yarn*
```shell
yarn install
```

To run the application for development, execute

*Using npm*
```shell
npm run dev
```

*Using yarn*
```shell
yarn dev
```

To run the application for production, execute

*Using npm*
```shell
npm run build
npm run preview
```

*Using yarn*
```shell
yarn build
yarn preview
```