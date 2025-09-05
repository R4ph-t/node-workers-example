// Store for all of the jobs in progress
const jobs = new Map()

// Kick off a new job by POST-ing to the server
async function addJob() {
  console.log('Adding job...')
  const job = await fetch('job/', {method: 'POST'}).then((res) => res.json())
  console.log(`Added job ${JSON.stringify(job)}`)
  jobs.set(job.id, job)
  render()
}

// Fetch updates for each job
async function updateJobs() {
  for await (const id of jobs.keys()) {
    await fetch(`/job/${id}`).then(res => {
      if (res.ok) {
        res.json().then(result => {
          if (jobs.has(id)) {
            jobs.set(id, result)
          }
        })
      }
    })
  }
  render()
  setTimeout(updateJobs, 200)
}

// Delete all stored jobs
function clear() {
  jobs.clear()
  render()
}

// Update the UI
function render() {
  const jobSummaryEl = document.querySelector("#job-summary")
  jobSummaryEl.innerHTML = ""
  jobs.forEach((job) => {
    jobSummaryEl.appendChild(createJobEl(job))
  })
}

// Renders the HTML for each job object
function createJobEl(job) {
  const jobEl = document.querySelector('#job-template')
    .content
    .cloneNode(true)

  const state = job.state || 'queued'
  jobEl.getElementById('id').innerHTML = job.id
  jobEl.getElementById('state').innerHTML = state

  const progressBar = jobEl.getElementById('progress-bar')
  if (state === "completed") {
    progressBar.classList.add('bg-purple')
    progressBar.style.width = `100%`
  } else if (state === "failed") {
    progressBar.classList.add('bg-dark-red')
    progressBar.style.width = `100%`
  } else {
    progressBar.classList.add('bg-light-purple')
    progressBar.style.width = `${job.progress || 0}%`
  }

  return jobEl
}

// Attach click handlers and kick off background processes
window.onload = function() {
  document.querySelector("#add-job").addEventListener("click", addJob)
  document.querySelector("#clear").addEventListener("click", clear)
  setTimeout(updateJobs, 200)
}
