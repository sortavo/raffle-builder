import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './badge';
import { 
  Check, 
  Clock, 
  AlertCircle, 
  X, 
  Star, 
  Zap, 
  Crown, 
  Sparkles,
  TrendingUp,
  Gift
} from 'lucide-react';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Badge',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary',
    variant: 'secondary',
  },
};

export const Destructive: Story = {
  args: {
    children: 'Destructive',
    variant: 'destructive',
  },
};

export const Outline: Story = {
  args: {
    children: 'Outline',
    variant: 'outline',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge>Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge>
        <Check className="mr-1 h-3 w-3" />
        Verified
      </Badge>
      <Badge variant="secondary">
        <Clock className="mr-1 h-3 w-3" />
        Pending
      </Badge>
      <Badge variant="destructive">
        <X className="mr-1 h-3 w-3" />
        Rejected
      </Badge>
      <Badge variant="outline">
        <AlertCircle className="mr-1 h-3 w-3" />
        Warning
      </Badge>
    </div>
  ),
};

export const StatusBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge className="bg-green-500 hover:bg-green-600">
        <Check className="mr-1 h-3 w-3" />
        Active
      </Badge>
      <Badge className="bg-yellow-500 hover:bg-yellow-600">
        <Clock className="mr-1 h-3 w-3" />
        Pending
      </Badge>
      <Badge className="bg-blue-500 hover:bg-blue-600">
        <Zap className="mr-1 h-3 w-3" />
        Processing
      </Badge>
      <Badge className="bg-gray-500 hover:bg-gray-600">
        Completed
      </Badge>
      <Badge variant="destructive">
        <X className="mr-1 h-3 w-3" />
        Cancelled
      </Badge>
    </div>
  ),
};

export const TicketStatus: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge className="bg-emerald-500 hover:bg-emerald-600">Available</Badge>
      <Badge className="bg-amber-500 hover:bg-amber-600">Reserved</Badge>
      <Badge className="bg-blue-500 hover:bg-blue-600">Sold</Badge>
      <Badge variant="destructive">Cancelled</Badge>
    </div>
  ),
};

export const PlanBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="outline">Free</Badge>
      <Badge className="bg-blue-500 hover:bg-blue-600">
        <Star className="mr-1 h-3 w-3" />
        Basic
      </Badge>
      <Badge className="bg-purple-500 hover:bg-purple-600">
        <Crown className="mr-1 h-3 w-3" />
        Pro
      </Badge>
      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
        <Sparkles className="mr-1 h-3 w-3" />
        Premium
      </Badge>
    </div>
  ),
};

export const CountBadges: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <div className="relative">
        <span className="text-sm">Notifications</span>
        <Badge className="absolute -right-6 -top-2 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
          3
        </Badge>
      </div>
      <Badge variant="secondary" className="text-xs">
        99+
      </Badge>
      <Badge variant="outline" className="text-xs">
        New
      </Badge>
    </div>
  ),
};

export const PromotionalBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge className="bg-gradient-to-r from-pink-500 to-rose-500">
        <Gift className="mr-1 h-3 w-3" />
        Special Offer
      </Badge>
      <Badge className="bg-gradient-to-r from-green-500 to-emerald-500">
        <TrendingUp className="mr-1 h-3 w-3" />
        Best Seller
      </Badge>
      <Badge className="animate-pulse bg-red-500">
        Hot Deal
      </Badge>
      <Badge variant="outline" className="border-amber-500 text-amber-500">
        <Star className="mr-1 h-3 w-3 fill-amber-500" />
        Featured
      </Badge>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Badge className="px-1.5 py-0.5 text-[10px]">Tiny</Badge>
      <Badge className="px-2 py-0.5 text-xs">Small</Badge>
      <Badge>Default</Badge>
      <Badge className="px-3 py-1 text-sm">Large</Badge>
    </div>
  ),
};

export const InContext: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">Raffle Title</h3>
        <Badge className="bg-green-500">Active</Badge>
        <Badge variant="secondary">Featured</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Ticket #0042</span>
        <Badge className="bg-blue-500 text-xs">Sold</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm">Price:</span>
        <span className="font-bold">$10.00</span>
        <Badge variant="destructive" className="text-xs">-20%</Badge>
      </div>
    </div>
  ),
};
