import { Resizable } from "re-resizable";
import { useState, useRef, useEffect } from "react";
import settingImg from "./assets/settings.svg";

export default function App() {
  const [mainScreenHight, setMainScreenHight] = useState(700);
  const [settingScreenWidth, setSettingScreenWidth] = useState(300);

  return (
    <main class="h-screen bg-black">
      <section className="flex h-[97%] flex-1">
        <SettingTabArea />

        {/* main screen */}
        <section
          id="mainScreen"
          className=" overflow-x-hidden w-full h-full flex flex-col"
        >
          {/* canvas + settings + attributes */}
          <section
            id="settingArea"
            style={{ height: `${mainScreenHight}px` }}
            className="w-full flex justify-center"
          >
            {/* settings */}
            <section
              style={{ width: `${settingScreenWidth}px` }}
              className="h-full bg-amber-400"
            ></section>

            <Divider
              id="settingArea"
              isVertical
              onChange={setSettingScreenWidth}
            />

            {/* canvas area */}
            <section
              style={{ width: `calc(100% - ${settingScreenWidth}px)` }}
              className="h-full"
            >
              <div className="relative top-2 left-2 bg-amber-200 w-60 h-6 rounded-md" />
            </section>

            {/* attributes */}
            <section className="float-right h-full w-96 bg-amber-200"></section>
          </section>

          {/* divider */}

          <Divider onChange={setMainScreenHight} id="mainScreen" />
          {/* timeline */}
          <section
            style={{ height: `calc(100% - ${mainScreenHight}px)` }}
            className="bg-red-300 w-full"
          ></section>
        </section>
      </section>

      <ShortcutArea />
    </main>
  );
}

function Divider({ onChange, isVertical = false, id = "mainContainer" }) {
  // Mouse down event to start resizing
  const handleMouseDownHeight = (event) => {
    event.preventDefault();
    // Add mousemove and mouseup listeners to the document
    document.addEventListener("mousemove", handleMouseMoveHeight);
    document.addEventListener("mouseup", handleMouseUpHeight);
  };

  // Mouse move event to adjust top section height
  const handleMouseMoveHeight = (event) => {
    const container = document.getElementById(id);
    const minHeight = Math.floor(container.clientHeight / 12); // Minimum height for the top section
    const maxHeight = container.clientHeight - minHeight;
    const newTopHeight = event.clientY - container.getBoundingClientRect().top;

    // Ensure the height stays within the bounds
    if (newTopHeight > minHeight && newTopHeight < maxHeight) {
      onChange(newTopHeight);
    }
  };

  // Mouse up event to stop resizing
  const handleMouseUpHeight = () => {
    // Remove mousemove and mouseup event listeners
    document.removeEventListener("mousemove", handleMouseMoveHeight);
    document.removeEventListener("mouseup", handleMouseUpHeight);
  };

  // Mouse down event to start horizontal resizing
  const handleMouseDownWidth = (event) => {
    event.preventDefault();
    // Add mousemove and mouseup listeners to the document
    document.addEventListener("mousemove", handleMouseMoveWidth);
    document.addEventListener("mouseup", handleMouseUpWidth);
  };

  // Mouse move event to adjust left section width
  const handleMouseMoveWidth = (event) => {
    const container = document.getElementById(id);
    const minWidth = 0; // Math.floor(container.clientWidth / 10); // Minimum width for the sections
    const maxWidth = container.clientWidth - minWidth;
    const newLeftWidth = event.clientX - container.getBoundingClientRect().left;

    if (newLeftWidth > minWidth && newLeftWidth < maxWidth) {
      onChange(newLeftWidth); // Update width of left section
    }
  };

  // Mouse up event to stop horizontal resizing
  const handleMouseUpWidth = () => {
    // Remove mousemove and mouseup event listeners
    document.removeEventListener("mousemove", handleMouseMoveWidth);
    document.removeEventListener("mouseup", handleMouseUpWidth);
  };

  return (
    <>
      {isVertical ? (
        <div
          id={`divider-${id}`}
          className="select-none w-1 h-full cursor-ew-resize bg-gray-600 hover:bg-blue-400"
          onMouseDown={handleMouseDownWidth}
        >
          {/* <div className="h-full border-l-2 border-dashed border-white" /> */}
        </div>
      ) : (
        <div
          id={`divider-${id}`}
          className="select-none w-full h-0.75 cursor-ns-resize bg-gray-600 hover:bg-blue-400"
          onMouseDown={handleMouseDownHeight}
        >
          {/* <div className="w-full border-t-2 border-dashed border-white" /> */}
        </div>
      )}
    </>
  );
}

function SettingTabArea() {
  return (
    <section className="h-full w-16 bg-amber-600">
      <SettingTabButton src={"./assets/settings.svg"} />
    </section>
  );
}

function SettingTabButton(src, title = "setting") {
  return <img src={`${src}`} alt={`${title}`} title={`${title}`} />;
}

function ShortcutArea() {
  return <section className="h-[3%] bg-amber-800"></section>;
}
