import Icon from './index'

export default function Demo() {
  return (
    <div className="flex flex-wrap gap-3">
      <Icon name="lock" className="h-6 w-6" />
      <Icon name="ton" className="h-6 w-6 fill-green-400 stroke-red-800" />
      <Icon name="gitbook" className="text-pink h-6 w-6" />
      <Icon name="circle-check-big" className="text-pink h-6 w-6 bg-purple-400" />
      <Icon name="user-circle" className="text-blue h-6 w-6" />
      <Icon name="share" className="text-pink h-6 w-6" />
      <Icon name="logo" className="bg-blue h-6 w-6 rounded-full bg-[red]" type="image" />
      <Icon name="share-color" className="bg-red h-6 w-6 rounded-full" type="image" />
    </div>
  )
}
